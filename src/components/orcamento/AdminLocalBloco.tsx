/**
 * AdminLocalBloco — componente que mostra Admin Local de um orçamento
 *
 * Estrutura visual:
 *   - 3 sub-blocos colapsáveis: Mobilização/Desmobilização, Permanência, Supervisão
 *   - Cada item editável (quantidade, valor unitário, observação)
 *   - Botão "Aplicar template" para puxar template do tipo de obra
 *   - Botão "Adicionar item" para buscar no catálogo
 *   - Recálculo automático ao mudar parâmetros do projeto
 *
 * Props:
 *   orcamentoId: UUID do orçamento
 *   parametrosProjeto: dados base usados nas fórmulas de escala
 */
import { useState } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Wrench,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAdminLocalAgrupado,
  useAdminLocalMutations,
  useAdminLocalCategorias,
  useAplicarTemplate,
  type AdminLocalItem,
  type AdminLocalCategoria,
} from "@/hooks/useAdminLocal";
import {
  calcularItemAdminLocal,
  type ParametrosProjeto,
  type AdminLocalBloco as TBloco,
} from "@/lib/admin-local-calculo";
import { useCustoCargo } from "@/hooks/useCustoCargo";
import { toast } from "sonner";

interface AdminLocalBlocoProps {
  orcamentoId: string;
  parametros: ParametrosProjeto;
  podeEditar: boolean;
}

const BLOCO_CONFIG: Record<TBloco, { label: string; cor: string }> = {
  mobilizacao_desmobilizacao: {
    label: "Mobilização / Desmobilização",
    cor: "border-blue-300 bg-blue-50/50",
  },
  permanencia: {
    label: "Permanência em Campo",
    cor: "border-green-300 bg-green-50/50",
  },
  supervisao: {
    label: "Supervisão",
    cor: "border-purple-300 bg-purple-50/50",
  },
};

export function AdminLocalBloco({
  orcamentoId,
  parametros,
  podeEditar,
}: AdminLocalBlocoProps) {
  const { grupos, totais, isLoading } = useAdminLocalAgrupado(orcamentoId);
  const aplicarTemplate = useAplicarTemplate(orcamentoId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando admin local...
      </div>
    );
  }

  const totalItens =
    grupos.mobilizacao_desmobilizacao.length +
    grupos.permanencia.length +
    grupos.supervisao.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Admin Local</h3>
          <p className="text-sm text-muted-foreground">
            Custos administrativos do projeto: mobilização, permanência e supervisão
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {formatBRL(totais.total)}
          </div>
          <div className="text-xs text-muted-foreground">
            {totalItens} {totalItens === 1 ? "item" : "itens"}
          </div>
        </div>
      </div>

      {podeEditar && totalItens === 0 && (
        <div className="rounded-lg border-2 border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Este orçamento ainda não tem itens de admin local
          </p>
          <Button
            onClick={() =>
              aplicarTemplate.mutate("Liberação Fundiária LD/LT", {
                onSuccess: () =>
                  toast.success("Template aplicado. Revise as quantidades."),
                onError: (e) => toast.error("Erro: " + e.message),
              })
            }
            disabled={aplicarTemplate.isPending}
          >
            <Wrench className="w-4 h-4 mr-2" />
            Aplicar template "Liberação Fundiária LD/LT"
          </Button>
        </div>
      )}

      {(["mobilizacao_desmobilizacao", "permanencia", "supervisao"] as const).map(
        (bloco) => (
          <BlocoColapsavel
            key={bloco}
            bloco={bloco}
            itens={grupos[bloco]}
            total={totais[bloco]}
            orcamentoId={orcamentoId}
            parametros={parametros}
            podeEditar={podeEditar}
          />
        )
      )}
    </div>
  );
}

function BlocoColapsavel({
  bloco,
  itens,
  total,
  orcamentoId,
  parametros,
  podeEditar,
}: {
  bloco: TBloco;
  itens: AdminLocalItem[];
  total: number;
  orcamentoId: string;
  parametros: ParametrosProjeto;
  podeEditar: boolean;
}) {
  const [aberto, setAberto] = useState(true);
  const config = BLOCO_CONFIG[bloco];

  return (
    <Collapsible open={aberto} onOpenChange={setAberto}>
      <div className={`rounded-lg border-2 ${config.cor}`}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 rounded-t-lg">
          <div className="flex items-center gap-2">
            {aberto ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="font-semibold">{config.label}</span>
            <Badge variant="secondary">{itens.length}</Badge>
          </div>
          <span className="font-mono font-semibold">{formatBRL(total)}</span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t bg-white/60 p-3 space-y-2">
            {itens.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">
                Nenhum item neste bloco
              </p>
            ) : (
              itens.map((item) => (
                <ItemLinha
                  key={item.id}
                  item={item}
                  orcamentoId={orcamentoId}
                  parametros={parametros}
                  podeEditar={podeEditar}
                />
              ))
            )}
            {podeEditar && (
              <AdicionarItemModal
                bloco={bloco}
                orcamentoId={orcamentoId}
                parametros={parametros}
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ItemLinha({
  item,
  parametros,
  podeEditar,
}: {
  item: AdminLocalItem;
  orcamentoId: string;
  parametros: ParametrosProjeto;
  podeEditar: boolean;
}) {
  const { atualizarItem, removerItem } = useAdminLocalMutations(item.orcamento_id);

  if (!item.categoria) return null;
  const cat = item.categoria;

  // Sprint 5B: puxa custo real do cargo quando vincula_cargo = true
  const { data: cargoData } = useCustoCargo(
    cat.vincula_cargo ? item.cargo_id : null
  );

  // Recalcular automaticamente se nem quantidade nem valor unitário são manuais
  const calc = calcularItemAdminLocal(parametros, {
    categoria: cat,
    escala_aplicada: item.escala_aplicada,
    frequencia_evento: item.frequencia_evento ?? undefined,
    dedicacao_percentual: item.dedicacao_percentual,
    cargo_custo_unitario: cargoData?.custo_mensal,
    valor_unitario_manual: item.valor_unitario_manual ? item.valor_unitario : undefined,
    quantidade_manual: item.quantidade_manual ? item.quantidade : undefined,
  });

  const handleQuantidadeChange = (v: string) => {
    const num = parseFloat(v);
    if (!Number.isFinite(num) || num < 0) return;
    atualizarItem.mutate({
      id: item.id,
      updates: { quantidade: num, quantidade_manual: true },
    });
  };

  const handleValorChange = (v: string) => {
    const num = parseFloat(v);
    if (!Number.isFinite(num) || num < 0) return;
    atualizarItem.mutate({
      id: item.id,
      updates: { valor_unitario: num, valor_unitario_manual: true },
    });
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center text-sm bg-white rounded p-2 border">
      <div className="col-span-4">
        <div className="font-medium">{item.nome_customizado ?? cat.nome}</div>
        <div className="text-xs text-muted-foreground">
          {cat.unidade_padrao} · {formatEscala(item.escala_aplicada)}
          {item.frequencia_evento === "ida_e_volta" && (
            <Badge variant="outline" className="text-xs ml-1">
              ida e volta
            </Badge>
          )}
          {cat.is_epi && (
            <Badge variant="outline" className="text-xs ml-1">
              vida útil {cat.vida_util_meses}m
            </Badge>
          )}
        </div>
      </div>

      <div className="col-span-2">
        <Input
          type="number"
          step="0.01"
          value={item.quantidade_manual ? item.quantidade : calc.quantidade}
          onChange={(e) => handleQuantidadeChange(e.target.value)}
          disabled={!podeEditar}
          className={
            item.quantidade_manual ? "border-amber-300 bg-amber-50" : ""
          }
        />
      </div>

      <div className="col-span-2">
        <Input
          type="number"
          step="0.01"
          value={item.valor_unitario_manual ? item.valor_unitario : calc.valor_unitario}
          onChange={(e) => handleValorChange(e.target.value)}
          disabled={!podeEditar}
          className={
            item.valor_unitario_manual ? "border-amber-300 bg-amber-50" : ""
          }
        />
      </div>

      <div className="col-span-3 text-right font-mono font-medium">
        {formatBRL(
          (item.quantidade_manual ? item.quantidade : calc.quantidade) *
            (item.valor_unitario_manual ? item.valor_unitario : calc.valor_unitario)
        )}
      </div>

      <div className="col-span-1 flex justify-end">
        {podeEditar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => {
              if (confirm(`Remover "${cat.nome}"?`)) {
                removerItem.mutate(item.id);
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AdicionarItemModal({
  bloco,
  orcamentoId,
  parametros,
}: {
  bloco: TBloco;
  orcamentoId: string;
  parametros: ParametrosProjeto;
}) {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");
  const { data: categorias } = useAdminLocalCategorias();
  const { adicionarItem } = useAdminLocalMutations(orcamentoId);

  const opcoes = (categorias ?? [])
    .filter((c) => c.bloco === bloco)
    .filter((c) =>
      filtro
        ? c.nome.toLowerCase().includes(filtro.toLowerCase()) ||
          c.codigo.toLowerCase().includes(filtro.toLowerCase())
        : true
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2">
          <Plus className="w-4 h-4 mr-1" />
          Adicionar item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar item — {BLOCO_CONFIG[bloco].label}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Filtrar..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto space-y-1">
          {opcoes.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                adicionarItem.mutate(
                  {
                    categoria_id: cat.id,
                    escala_aplicada: cat.escala_padrao,
                    quantidade: 0,
                    valor_unitario: cat.valor_referencia,
                    frequencia_evento: cat.frequencia_evento_padrao,
                    dedicacao_percentual: 100,
                    ordem: cat.ordem,
                  },
                  {
                    onSuccess: () => {
                      toast.success(`"${cat.nome}" adicionado`);
                      setOpen(false);
                    },
                  }
                );
              }}
              className="w-full text-left p-2 rounded hover:bg-secondary border"
            >
              <div className="font-medium text-sm">{cat.nome}</div>
              <div className="text-xs text-muted-foreground">
                {cat.descricao} · ref: {formatBRL(cat.valor_referencia)}/{cat.unidade_padrao}
              </div>
            </button>
          ))}
          {opcoes.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Nenhuma categoria encontrada
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBRL(v: number): string {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function formatEscala(escala: string): string {
  const map: Record<string, string> = {
    fixo: "fixo",
    por_pessoa: "por pessoa",
    por_equipe: "por equipe",
    por_dia: "por dia",
    por_mes: "por mês",
    por_km: "por km",
    por_propriedade: "por propriedade",
    por_pessoa_dia: "por pessoa × dia",
    por_pessoa_mes: "por pessoa × mês",
    por_equipe_dia: "por equipe × dia",
    por_equipe_mes: "por equipe × mês",
    percentual_aluguel: "% do aluguel",
  };
  return map[escala] ?? escala;
}

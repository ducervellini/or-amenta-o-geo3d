/**
 * WizardNovoOrcamento — 4 telas para criar orçamento com template aplicado.
 *
 * Fluxo:
 *   Tela 1: Tipo de obra → seleciona template
 *   Tela 2: Dimensões → qtd_propriedades, extensao_km, distância base→obra
 *   Tela 3: Cliente → selecionar existente ou criar rápido
 *   Tela 4: Prazo → dias_projeto, qtd_equipes, qtd_pessoas, qtd_supervisores
 *
 * Após "Criar": cria orçamento + parâmetros + aplica template + navega.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useOrcamentoTemplates,
  useAplicarTemplateOrcamento,
  type OrcamentoTemplate,
} from "@/hooks/useOrcamentoTemplates";
import { avaliarFormula } from "@/lib/formula-quantidade";

interface WizardState {
  // Tela 1
  templateId: string | null;
  template: OrcamentoTemplate | null;
  // Tela 2
  qtd_propriedades: number;
  extensao_km: number;
  distancia_base_km: number;
  uf: string;
  municipio: string;
  // Tela 3
  cliente_id: string | null;
  cliente_nome_rapido: string;
  // Tela 4
  dias_projeto: number;
  qtd_equipes: number;
  qtd_pessoas: number;
  qtd_supervisores: number;
}

const ESTADO_INICIAL: WizardState = {
  templateId: null,
  template: null,
  qtd_propriedades: 0,
  extensao_km: 0,
  distancia_base_km: 0,
  uf: "",
  municipio: "",
  cliente_id: null,
  cliente_nome_rapido: "",
  dias_projeto: 90,
  qtd_equipes: 2,
  qtd_pessoas: 6,
  qtd_supervisores: 0,
};

export function WizardNovoOrcamento({
  onCancelar,
}: {
  onCancelar: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [etapa, setEtapa] = useState(1);
  const [estado, setEstado] = useState<WizardState>(ESTADO_INICIAL);

  const { data: templates } = useOrcamentoTemplates();
  const aplicarTemplate = useAplicarTemplateOrcamento();

  const { data: clientes } = useQuery({
    queryKey: ["clientes_ativos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome")
        .is("deleted_at", null)
        .order("nome");
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!estado.templateId) throw new Error("Selecione um template");

      // 1. Resolver cliente
      let clienteId = estado.cliente_id;
      if (!clienteId && estado.cliente_nome_rapido.trim()) {
        const { data: novoCli, error: e1 } = await supabase
          .from("clientes")
          .insert({ nome: estado.cliente_nome_rapido.trim() } as never)
          .select("id")
          .single();
        if (e1) throw e1;
        clienteId = (novoCli as { id: string }).id;
      }
      if (!clienteId) throw new Error("Cliente é obrigatório");

      // 2. Criar orçamento
      const { data: orc, error: e2 } = await supabase
        .from("orcamentos")
        .insert({
          cliente_id: clienteId,
          descricao: `${estado.template?.nome} - ${estado.municipio}/${estado.uf}`,
          status: "rascunho",
          created_by: user?.id,
        } as never)
        .select("id")
        .single();
      if (e2) throw e2;
      const orcamentoId = (orc as { id: string }).id;

      // 3. Salvar parâmetros do orçamento
      const { error: e3 } = await supabase.from("orcamento_parametros").insert({
        orcamento_id: orcamentoId,
        qtd_propriedades: estado.qtd_propriedades,
        extensao_km: estado.extensao_km,
        qtd_pessoas: estado.qtd_pessoas,
        qtd_equipes: estado.qtd_equipes,
        qtd_supervisores: estado.qtd_supervisores,
        dias_projeto: estado.dias_projeto,
        distancia_base_km: estado.distancia_base_km,
        uf: estado.uf || null,
        municipio: estado.municipio || null,
        tipo_obra: estado.template?.tipo_obra ?? null,
      });
      if (e3) throw e3;

      // 4. Aplicar template (RPC)
      await aplicarTemplate.mutateAsync({ orcamentoId, templateId: estado.templateId });

      return orcamentoId;
    },
    onSuccess: (orcamentoId) => {
      toast.success("Orçamento criado a partir do template");
      navigate(`/orcamentos/${orcamentoId}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // === Previews ao vivo ===
  const previewItens = (() => {
    if (!estado.template) return [];
    return estado.template.itens_servico.slice(0, 6).map((item) => {
      const r = avaliarFormula(item.formula_quantidade, {
        qtd_propriedades: estado.qtd_propriedades,
        extensao_km: estado.extensao_km,
        qtd_pessoas: estado.qtd_pessoas,
        qtd_equipes: estado.qtd_equipes,
        qtd_supervisores: estado.qtd_supervisores,
        dias_projeto: estado.dias_projeto,
        distancia_base_km: estado.distancia_base_km,
      });
      return {
        servico: item.servico_codigo,
        variacao: item.variacao_nome ?? "(default)",
        formula: item.formula_quantidade,
        quantidade: r.valor,
        erro: r.erro,
      };
    });
  })();

  const podeAvancar = (() => {
    if (etapa === 1) return !!estado.templateId;
    if (etapa === 2) return estado.qtd_propriedades > 0 || estado.extensao_km > 0;
    if (etapa === 3) return !!estado.cliente_id || estado.cliente_nome_rapido.trim().length > 2;
    if (etapa === 4) return estado.dias_projeto > 0 && estado.qtd_equipes > 0 && estado.qtd_pessoas > 0;
    return false;
  })();

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <Badge variant={etapa === n ? "default" : etapa > n ? "secondary" : "outline"}>
              {etapa > n ? <Check className="w-3 h-3" /> : n}
            </Badge>
            {n < 4 && <ChevronRight className="w-3 h-3" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          {etapa === 1 && (
            <>
              <CardTitle>1. Tipo de obra</CardTitle>
              <CardDescription>
                Selecione o template que melhor representa o projeto a orçar.
              </CardDescription>
            </>
          )}
          {etapa === 2 && (
            <>
              <CardTitle>2. Dimensões do projeto</CardTitle>
              <CardDescription>
                Quantidades-base do projeto (usadas nas fórmulas dos serviços).
              </CardDescription>
            </>
          )}
          {etapa === 3 && (
            <>
              <CardTitle>3. Cliente</CardTitle>
              <CardDescription>
                Selecione um cliente existente ou crie um novo rapidamente.
              </CardDescription>
            </>
          )}
          {etapa === 4 && (
            <>
              <CardTitle>4. Prazo e equipe</CardTitle>
              <CardDescription>
                Duração e dimensionamento da equipe.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {/* === TELA 1 === */}
          {etapa === 1 && (
            <div className="space-y-2">
              {!templates && <Loader2 className="w-4 h-4 animate-spin" />}
              {templates?.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setEstado((s) => ({ ...s, templateId: tpl.id, template: tpl }))}
                  className={`w-full text-left p-3 rounded-lg border-2 transition ${
                    estado.templateId === tpl.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="font-semibold">{tpl.nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {tpl.descricao ?? `Template para ${tpl.tipo_obra}`}
                  </div>
                  <div className="text-xs mt-1">
                    <Badge variant="outline" className="text-xs">
                      {tpl.itens_servico?.length ?? 0} serviços padrão
                    </Badge>
                  </div>
                </button>
              ))}
              {templates && templates.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum template cadastrado. Crie um em "Templates de Orçamento" antes de prosseguir.
                </p>
              )}
            </div>
          )}

          {/* === TELA 2 === */}
          {etapa === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Quantidade de propriedades</Label>
                <Input
                  type="number"
                  min="0"
                  value={estado.qtd_propriedades}
                  onChange={(e) => setEstado((s) => ({ ...s, qtd_propriedades: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Extensão da LD/LT (km)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={estado.extensao_km}
                  onChange={(e) => setEstado((s) => ({ ...s, extensao_km: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Distância base → obra (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={estado.distancia_base_km}
                  onChange={(e) => setEstado((s) => ({ ...s, distancia_base_km: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>UF (opcional)</Label>
                <Input
                  maxLength={2}
                  value={estado.uf}
                  onChange={(e) => setEstado((s) => ({ ...s, uf: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Município (opcional)</Label>
                <Input
                  value={estado.municipio}
                  onChange={(e) => setEstado((s) => ({ ...s, municipio: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* === TELA 3 === */}
          {etapa === 3 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Cliente existente</Label>
                <select
                  className="w-full p-2 rounded border bg-background"
                  value={estado.cliente_id ?? ""}
                  onChange={(e) =>
                    setEstado((s) => ({
                      ...s,
                      cliente_id: e.target.value || null,
                      cliente_nome_rapido: "",
                    }))
                  }
                >
                  <option value="">— Selecionar —</option>
                  {(clientes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-center text-xs text-muted-foreground">— ou —</div>
              <div className="space-y-1">
                <Label>Criar cliente rápido</Label>
                <Input
                  placeholder="Nome do cliente (CNPJ pode ser adicionado depois)"
                  value={estado.cliente_nome_rapido}
                  onChange={(e) =>
                    setEstado((s) => ({
                      ...s,
                      cliente_nome_rapido: e.target.value,
                      cliente_id: null,
                    }))
                  }
                />
              </div>
            </div>
          )}

          {/* === TELA 4 === */}
          {etapa === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Prazo do projeto (dias)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={estado.dias_projeto}
                    onChange={(e) => setEstado((s) => ({ ...s, dias_projeto: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Equivale a {Math.ceil(estado.dias_projeto / 22)} meses úteis
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Nº de equipes</Label>
                  <Input
                    type="number"
                    min="1"
                    value={estado.qtd_equipes}
                    onChange={(e) => setEstado((s) => ({ ...s, qtd_equipes: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Total de pessoas em campo</Label>
                  <Input
                    type="number"
                    min="1"
                    value={estado.qtd_pessoas}
                    onChange={(e) => setEstado((s) => ({ ...s, qtd_pessoas: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Supervisores em campo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={estado.qtd_supervisores}
                    onChange={(e) =>
                      setEstado((s) => ({ ...s, qtd_supervisores: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Preview dos itens calculados */}
              {previewItens.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Sparkles className="w-4 h-4" />
                    Preview: o template vai criar (entre outros):
                  </div>
                  <div className="text-xs space-y-1 font-mono">
                    {previewItens.map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {p.servico} ({p.variacao}) · {p.formula}
                        </span>
                        <span className={p.erro ? "text-destructive" : "text-foreground"}>
                          = {p.quantidade}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Você pode ajustar quantidades depois na página do orçamento.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (etapa === 1 ? onCancelar() : setEtapa(etapa - 1))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {etapa === 1 ? "Cancelar" : "Voltar"}
        </Button>

        {etapa < 4 ? (
          <Button onClick={() => setEtapa(etapa + 1)} disabled={!podeAvancar}>
            Avançar
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => criar.mutate()}
            disabled={!podeAvancar || criar.isPending}
          >
            {criar.isPending ? "Criando..." : "Criar orçamento"}
            <Check className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

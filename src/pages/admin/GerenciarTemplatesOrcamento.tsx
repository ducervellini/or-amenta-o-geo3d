/**
 * GerenciarTemplatesOrcamento — CRUD de templates por tipo de obra.
 *
 * Cada template é uma lista de itens (servico_codigo + variacao_nome +
 * formula_quantidade) que será aplicada ao criar um orçamento.
 */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit3 } from "lucide-react";
import {
  useOrcamentoTemplates,
  type OrcamentoTemplate,
  type TemplateItemServico,
} from "@/hooks/useOrcamentoTemplates";
import { validarFormula, variaveisPermitidas, funcoesPermitidas } from "@/lib/formula-quantidade";
import { toast } from "sonner";

export default function GerenciarTemplatesOrcamento() {
  const { canEditParametros, loading } = useAuth();
  const { data: templates, isLoading } = useOrcamentoTemplates();
  const [templateSelId, setTemplateSelId] = useState<string | null>(null);

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto m-8" />;
  if (!canEditParametros) return <Navigate to="/" replace />;

  const selecionado = (templates ?? []).find((t) => t.id === templateSelId);

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Templates de Orçamento</h1>
          <p className="page-subtitle">
            Pacotes pré-montados por tipo de obra: ao criar um novo orçamento, o template
            popula 80% da estrutura com fórmulas que dependem dos parâmetros do projeto.
          </p>
        </div>
        <NovoTemplateDialog />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-sm">Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {(templates ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateSelId(t.id)}
                className={`w-full text-left p-2 rounded text-sm transition ${
                  templateSelId === t.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                }`}
              >
                <div className="font-medium">{t.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {t.tipo_obra} · {t.itens_servico?.length ?? 0} itens
                </div>
              </button>
            ))}
            {(templates ?? []).length === 0 && (
              <p className="text-xs italic text-muted-foreground">
                Nenhum template ainda
              </p>
            )}
          </CardContent>
        </Card>

        <div className="col-span-8">
          {selecionado ? (
            <PainelTemplate template={selecionado} />
          ) : (
            <Card>
              <CardContent className="text-center text-muted-foreground italic py-12 text-sm">
                Selecione um template à esquerda
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PainelTemplate({ template }: { template: OrcamentoTemplate }) {
  const qc = useQueryClient();

  const atualizar = useMutation({
    mutationFn: async (updates: Partial<OrcamentoTemplate>) => {
      const { error } = await supabase
        .from("orcamento_templates")
        .update(updates)
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orcamento_templates"] });
      toast.success("Template atualizado");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.nome}</CardTitle>
        <CardDescription>
          {template.tipo_obra} · {template.itens_servico?.length ?? 0} itens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ItensTemplateEditor
          itens={template.itens_servico ?? []}
          onChange={(novosItens) =>
            atualizar.mutate({ itens_servico: novosItens } as Partial<OrcamentoTemplate>)
          }
        />
        <div className="text-xs text-muted-foreground border-t pt-3">
          <strong>Variáveis disponíveis nas fórmulas:</strong>{" "}
          {variaveisPermitidas().join(", ")}
          <br />
          <strong>Funções:</strong> {funcoesPermitidas().join(", ")}
        </div>
      </CardContent>
    </Card>
  );
}

function ItensTemplateEditor({
  itens,
  onChange,
}: {
  itens: TemplateItemServico[];
  onChange: (itens: TemplateItemServico[]) => void;
}) {
  const { data: servicos } = useQuery({
    queryKey: ["servicos_ativos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("servicos")
        .select("codigo, nome")
        .is("deleted_at", null)
        .eq("ativo", true);
      return data ?? [];
    },
  });

  const adicionar = () => {
    const novo: TemplateItemServico = {
      servico_codigo: "",
      formula_quantidade: "1",
    };
    onChange([...itens, novo]);
  };

  const editar = (idx: number, patch: Partial<TemplateItemServico>) => {
    const copia = [...itens];
    copia[idx] = { ...copia[idx], ...patch };
    onChange(copia);
  };

  const remover = (idx: number) => {
    if (!confirm("Remover este item do template?")) return;
    onChange(itens.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {itens.map((item, idx) => {
        const erroFormula = validarFormula(item.formula_quantidade);
        return (
          <div key={idx} className="grid grid-cols-12 gap-2 items-start border rounded p-2">
            <div className="col-span-4">
              <Label className="text-xs">Serviço (código)</Label>
              <select
                className="w-full p-1.5 rounded border bg-background text-sm"
                value={item.servico_codigo}
                onChange={(e) => editar(idx, { servico_codigo: e.target.value })}
              >
                <option value="">— Selecionar —</option>
                {(servicos ?? []).map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.codigo} — {s.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Variação (nome)</Label>
              <Input
                size={1}
                className="text-sm"
                value={item.variacao_nome ?? ""}
                onChange={(e) => editar(idx, { variacao_nome: e.target.value || undefined })}
                placeholder="(default)"
              />
            </div>
            <div className="col-span-4">
              <Label className="text-xs">Fórmula de quantidade</Label>
              <Input
                size={1}
                className={`text-sm font-mono ${erroFormula ? "border-destructive" : ""}`}
                value={item.formula_quantidade}
                onChange={(e) => editar(idx, { formula_quantidade: e.target.value })}
              />
              {erroFormula && (
                <p className="text-xs text-destructive mt-0.5">{erroFormula}</p>
              )}
            </div>
            <div className="col-span-1 flex items-end h-full">
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive h-8 w-8"
                onClick={() => remover(idx)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="w-full" onClick={adicionar}>
        <Plus className="w-3 h-3 mr-1" />
        Adicionar item
      </Button>
    </div>
  );
}

function NovoTemplateDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipoObra, setTipoObra] = useState("");
  const [descricao, setDescricao] = useState("");

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orcamento_templates").insert({
        nome: nome.trim(),
        tipo_obra: tipoObra.trim().toLowerCase().replace(/\s+/g, "_"),
        descricao: descricao || null,
        itens_servico: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orcamento_templates"] });
      toast.success("Template criado — adicione os itens");
      setOpen(false);
      setNome("");
      setTipoObra("");
      setDescricao("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-1" />
          Novo template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo template de orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Liberação Fundiária LD/LT - Compacto"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo de obra (categoria)</Label>
            <Input
              value={tipoObra}
              onChange={(e) => setTipoObra(e.target.value)}
              placeholder="Ex: liberacao_fundiaria_ld_lt"
            />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <Button onClick={() => criar.mutate()} disabled={criar.isPending} className="w-full">
            {criar.isPending ? "Criando..." : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

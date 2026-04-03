import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Plus, Trash2, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarCenario } from "@/lib/audit";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  composicaoId: string;
  dadosAtuais: Record<string, unknown>;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function GerenciadorCenarios({ composicaoId, dadosAtuais }: Props) {
  const [cenarios, setCenarios] = useState<Record<string, unknown>[]>([]);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [comparando, setComparando] = useState<Record<string, unknown>[] | null>(null);

  const fetch = async () => {
    const { data } = await (supabase.from as any)("orcamento_cenarios")
      .select("*")
      .eq("composicao_id", composicaoId)
      .order("created_at", { ascending: false });
    setCenarios(data || []);
  };

  useEffect(() => { fetch(); }, [composicaoId]);

  const handleSalvar = async () => {
    if (!nome.trim()) { toast.error("Nome do cenário é obrigatório"); return; }
    setSaving(true);
    const { error } = await salvarCenario(composicaoId, nome, dadosAtuais);
    if (error) toast.error("Erro ao salvar cenário");
    else { toast.success("Cenário salvo"); setNome(""); fetch(); }
    setSaving(false);
  };

  const handleExcluir = async (id: string) => {
    await (supabase.from as any)("orcamento_cenarios").delete().eq("id", id);
    toast.success("Cenário excluído");
    fetch();
  };

  const handleComparar = () => {
    if (cenarios.length < 2) { toast.error("Salve pelo menos 2 cenários para comparar"); return; }
    setComparando(cenarios.slice(0, 3));
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Layers className="w-4 h-4" /> Cenários
        </h3>
        {cenarios.length >= 2 && (
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleComparar}>
            <GitCompare className="w-3 h-3" /> Comparar
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cenário..." className="text-xs" />
        <Button size="sm" onClick={handleSalvar} disabled={saving} className="gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Salvar
        </Button>
      </div>

      {cenarios.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhum cenário salvo</p>
      ) : (
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {cenarios.map((c) => {
            const dados = c.dados as Record<string, unknown> | null;
            const custo = dados?.custo_direto ? fmt(Number(dados.custo_direto)) : "—";
            return (
              <div key={String(c.id)} className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-3 py-2">
                <div>
                  <span className="font-medium">{String(c.nome)}</span>
                  <span className="text-muted-foreground ml-2">R$ {custo}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleExcluir(String(c.id))}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!comparando} onOpenChange={() => setComparando(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comparativo de Cenários</DialogTitle>
          </DialogHeader>
          {comparando && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Métrica</th>
                    {comparando.map((c) => (
                      <th key={String(c.id)} className="text-right py-2 px-2">{String(c.nome)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["custo_direto", "mao_de_obra", "equipamentos", "veiculos", "materiais"].map((key) => (
                    <tr key={key} className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-medium capitalize">{key.replace(/_/g, " ")}</td>
                      {comparando.map((c) => {
                        const dados = c.dados as Record<string, unknown> | null;
                        const val = dados?.[key] ? Number(dados[key]) : 0;
                        return <td key={String(c.id)} className="text-right py-1.5 px-2 font-mono">R$ {fmt(val)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

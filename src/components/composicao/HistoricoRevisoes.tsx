import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { salvarRevisao } from "@/lib/audit";
import { toast } from "sonner";

const fmt = (d: string) => new Date(d).toLocaleString("pt-BR");

interface Props {
  composicaoId: string;
  dadosAtuais: Record<string, unknown>;
}

export function HistoricoRevisoes({ composicaoId, dadosAtuais }: Props) {
  const [revisoes, setRevisoes] = useState<Record<string, unknown>[]>([]);
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null);

  const fetchRevisoes = async () => {
    const { data } = await (supabase.from as any)("orcamento_revisoes")
      .select("*")
      .eq("composicao_id", composicaoId)
      .order("versao", { ascending: false });
    setRevisoes(data || []);
  };

  useEffect(() => { fetchRevisoes(); }, [composicaoId]);

  const handleSalvar = async () => {
    setSaving(true);
    const { error } = await salvarRevisao(composicaoId, dadosAtuais, observacao || undefined);
    if (error) toast.error("Erro ao salvar revisão");
    else { toast.success("Revisão salva"); setObservacao(""); fetchRevisoes(); }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <History className="w-4 h-4" /> Histórico de Revisões
        </h3>
      </div>

      <div className="flex gap-2">
        <Input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observação da revisão..."
          className="text-xs"
        />
        <Button size="sm" onClick={handleSalvar} disabled={saving} className="gap-1 shrink-0">
          <Save className="w-3.5 h-3.5" /> Salvar
        </Button>
      </div>

      {revisoes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhuma revisão salva</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {revisoes.map((r) => (
            <div key={String(r.id)} className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-3 py-2">
              <div>
                <span className="font-semibold text-accent">v{String(r.versao)}</span>
                <span className="text-muted-foreground ml-2">{fmt(String(r.created_at))}</span>
                {r.observacao && <span className="ml-2 text-muted-foreground">— {String(r.observacao)}</span>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewData(r.dados as Record<string, unknown>)}>
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewData} onOpenChange={() => setViewData(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados da Revisão</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto">
            {JSON.stringify(viewData, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

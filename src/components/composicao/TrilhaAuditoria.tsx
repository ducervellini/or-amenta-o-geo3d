import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

interface Props {
  registroId: string;
}

const fmtDate = (d: string) => new Date(d).toLocaleString("pt-BR");
const acaoLabels: Record<string, string> = {
  criar: "Criação",
  editar: "Edição",
  excluir: "Exclusão",
  aprovar: "Aprovação",
  travar: "Travamento",
  duplicar: "Duplicação",
  cenario: "Cenário",
};

export function TrilhaAuditoria({ registroId }: Props) {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from as any)("audit_log")
        .select("*")
        .eq("registro_id", registroId)
        .order("created_at", { ascending: false })
        .limit(20);
      setLogs(data || []);
    })();
  }, [registroId]);

  if (logs.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-5 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Shield className="w-4 h-4" /> Trilha de Auditoria
      </h3>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {logs.map((log) => (
          <div key={String(log.id)} className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-accent">
                {acaoLabels[String(log.acao)] || String(log.acao)}
              </span>
              <span className="text-muted-foreground">{fmtDate(String(log.created_at))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

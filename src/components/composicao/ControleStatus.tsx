import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Unlock, CheckCircle, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { registrarAuditoria } from "@/lib/audit";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  composicaoId: string;
  status: string;
  travado: boolean;
  onStatusChange: (status: string, travado: boolean) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  em_revisao: { label: "Em Revisão", variant: "outline" },
  aprovado: { label: "Aprovado", variant: "default" },
};

export function ControleStatus({ composicaoId, status, travado, onStatusChange }: Props) {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const isAdmin = hasRole("admin") || hasRole("diretor") || hasRole("gerente");

  const updateStatus = async (newStatus: string, newTravado: boolean) => {
    const updates: Record<string, unknown> = { status: newStatus, travado: newTravado };
    if (newStatus === "aprovado") {
      updates.aprovado_por = user?.id;
      updates.aprovado_em = new Date().toISOString();
    }
    await (supabase.from as any)("composicoes").update(updates).eq("id", composicaoId);
    await registrarAuditoria("composicoes", composicaoId, newStatus === "aprovado" ? "aprovar" : "editar", { status }, updates);
    onStatusChange(newStatus, newTravado);
    toast.success(`Status alterado para ${statusConfig[newStatus]?.label || newStatus}`);
    setConfirmAction(null);
  };

  const handleDuplicar = async () => {
    const { data: comp } = await (supabase.from as any)("composicoes").select("*").eq("id", composicaoId).single();
    if (!comp) return;
    const { id: _, created_at, updated_at, ...rest } = comp;
    const newComp = { ...rest, codigo: `${comp.codigo}-COPIA`, nome: `${comp.nome} (Cópia)`, status: "rascunho", travado: false, created_by: user?.id };
    const { data: novo } = await (supabase.from as any)("composicoes").insert(newComp).select().single();
    if (novo) {
      const { data: itens } = await (supabase.from as any)("composicao_itens").select("*").eq("composicao_id", composicaoId);
      if (itens?.length) {
        const novosItens = itens.map((i: any) => {
          const { id: _id, created_at: _ca, updated_at: _ua, composicao_id: _cid, ...rest } = i;
          return { ...rest, composicao_id: novo.id };
        });
        await (supabase.from as any)("composicao_itens").insert(novosItens);
      }
      await registrarAuditoria("composicoes", novo.id, "duplicar", null, { origem: composicaoId });
      toast.success("Composição duplicada com sucesso");
      navigate(`/composicoes/${novo.id}`);
    }
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status</h3>
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig[status]?.variant || "secondary"}>
            {statusConfig[status]?.label || status}
          </Badge>
          {travado && <Lock className="w-3.5 h-3.5 text-destructive" />}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {!travado && status === "rascunho" && (
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus("em_revisao", false)}>
            Enviar p/ Revisão
          </Button>
        )}
        {!travado && status === "em_revisao" && isAdmin && (
          <Button size="sm" variant="default" className="text-xs gap-1" onClick={() => setConfirmAction("aprovar")}>
            <CheckCircle className="w-3 h-3" /> Aprovar
          </Button>
        )}
        {status === "aprovado" && !travado && isAdmin && (
          <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={() => setConfirmAction("travar")}>
            <Lock className="w-3 h-3" /> Travar
          </Button>
        )}
        {travado && isAdmin && (
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus("em_revisao", false)}>
            <Unlock className="w-3 h-3" /> Destravar
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={handleDuplicar}>
          <Copy className="w-3 h-3" /> Duplicar
        </Button>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "aprovar" ? "Aprovar orçamento?" : "Travar orçamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "aprovar"
                ? "O orçamento será marcado como aprovado. Ainda poderá ser editado até ser travado."
                : "O orçamento será travado e nenhuma edição será permitida até que seja destravado por um administrador."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmAction === "aprovar") updateStatus("aprovado", false);
              else updateStatus("aprovado", true);
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

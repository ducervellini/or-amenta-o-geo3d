/**
 * AdminCentralMensal — gestão do percentual mensal de admin central
 *
 * Apenas gerente/diretor/admin acessam.
 * Mostra histórico em tabela, permite inserir o mês corrente.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
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
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface AdminCentralMes {
  id: string;
  vigencia_mes: string;
  percentual: number;
  observacao: string | null;
  created_at: string;
}

export default function AdminCentralMensal() {
  const { canEditParametros, loading } = useAuth();
  const queryClient = useQueryClient();

  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [percentual, setPercentual] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: historico, isLoading } = useQuery({
    queryKey: ["parametros_admin_central_mensal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros_admin_central_mensal")
        .select("*")
        .is("deleted_at", null)
        .order("vigencia_mes", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminCentralMes[];
    },
  });

  const adicionar = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(percentual.replace(",", "."));
      if (!Number.isFinite(pct) || pct < 0 || pct >= 100) {
        throw new Error("Percentual inválido (deve ser entre 0 e 100)");
      }
      const vigencia_mes = `${mes}-01`;
      const { error } = await supabase
        .from("parametros_admin_central_mensal")
        .insert({
          vigencia_mes,
          percentual: pct,
          observacao: observacao || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parametros_admin_central_mensal"] });
      queryClient.invalidateQueries({ queryKey: ["admin_central_vigente"] });
      toast.success("Percentual cadastrado");
      setPercentual("");
      setObservacao("");
    },
    onError: (e: Error) => {
      if (e.message.includes("duplicate key")) {
        toast.error("Já existe percentual para este mês — edite o existente");
      } else if (e.message.includes("permission denied")) {
        toast.error("Sem permissão para cadastrar");
      } else {
        toast.error(e.message);
      }
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!canEditParametros) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Admin Central — Percentual Mensal
        </h1>
        <p className="page-subtitle">
          Rateio dos custos administrativos da empresa sobre os projetos, atualizado a cada
          fechamento mensal do financeiro. O orçamento aplica o percentual vigente na sua data
          de finalização.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Cadastrar novo mês</CardTitle>
            <CardDescription>
              Use o primeiro dia do mês (ex: 2026-05-01 para maio).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Mês de vigência</Label>
              <Input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Percentual (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                placeholder="Ex: 12.5"
              />
            </div>
            <div className="space-y-1">
              <Label>Observação (memória do rateio)</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Custos administrativos: R$ X | Custos diretos rateados: R$ Y | Rateio: Z%"
                rows={3}
              />
            </div>
            <Button
              onClick={() => adicionar.mutate()}
              disabled={adicionar.isPending}
              className="w-full"
            >
              {adicionar.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
            <CardDescription>Vigências passadas e futuras.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (historico ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum percentual cadastrado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2">Mês</th>
                      <th className="text-right py-2">%</th>
                      <th className="text-left py-2 px-3">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historico ?? []).map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 font-mono">
                          {formatMes(m.vigencia_mes)}
                        </td>
                        <td className="py-2 text-right font-mono font-medium">
                          {Number(m.percentual).toFixed(3)}%
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {m.observacao ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatMes(iso: string): string {
  const [y, m] = iso.split("-");
  const meses = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  return `${meses[parseInt(m) - 1]}/${y}`;
}

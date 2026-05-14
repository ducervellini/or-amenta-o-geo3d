/**
 * OrcamentosSimilares — mostra na página do orçamento os 5 orçamentos
 * mais similares pelo tipo de obra + tamanho + prazo.
 *
 * Útil pro orçamentista entender a faixa de preço esperada antes de finalizar.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { useOrcamentosSimilares } from "@/hooks/useBenchmark";

interface Props {
  orcamentoId: string;
}

export function OrcamentosSimilares({ orcamentoId }: Props) {
  const { data: similares, isLoading } = useOrcamentosSimilares(orcamentoId, 5);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Buscando orçamentos similares...
      </div>
    );
  }

  if (!similares || similares.length === 0) {
    return null;
  }

  // Quartis estimados rapidamente
  const precos = similares.map((s) => s.preco_por_unidade).filter((p) => p > 0).sort((a, b) => a - b);
  const mediana = precos.length > 0 ? precos[Math.floor(precos.length / 2)] : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Orçamentos similares
        </CardTitle>
        <CardDescription className="text-xs">
          Baseado em tipo de obra, tamanho e prazo. Use como referência de mercado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mediana > 0 && (
          <div className="mb-3 text-xs text-muted-foreground border-l-2 border-primary pl-2">
            Preço/unidade <strong>mediano</strong> dos similares:{" "}
            <span className="text-foreground font-mono font-semibold">{fmtBRL(mediana)}</span>
          </div>
        )}

        <div className="space-y-1 text-xs">
          {similares.map((s) => (
            <div
              key={s.orcamento_id}
              className="grid grid-cols-12 gap-2 items-center py-1 border-b last:border-0"
            >
              <div className="col-span-4 truncate">
                <div className="font-medium">{s.cliente_nome ?? "—"}</div>
                <div className="text-muted-foreground text-[10px]">
                  {formatTipoObra(s.tipo_obra)}
                </div>
              </div>
              <div className="col-span-3 text-muted-foreground text-[10px]">
                {s.qtd_propriedades > 0 && `${s.qtd_propriedades} prop`}
                {s.extensao_km > 0 && ` · ${Number(s.extensao_km).toFixed(1)} km`}
                <br />
                {s.dias_projeto > 0 && `${s.dias_projeto} dias`}
              </div>
              <div className="col-span-3 text-right font-mono">
                {s.preco_por_unidade > 0 && (
                  <>
                    <div className="font-medium">{fmtBRL(s.preco_por_unidade)}/un</div>
                    <div className="text-muted-foreground text-[10px]">
                      total {fmtBRL(s.custo_total)}
                    </div>
                  </>
                )}
              </div>
              <div className="col-span-2 text-right space-y-0.5">
                <Badge
                  variant={
                    s.estagio_pipeline === "ganho"
                      ? "default"
                      : s.estagio_pipeline === "perdido"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {s.estagio_pipeline}
                </Badge>
                <div className="text-[10px] text-muted-foreground">
                  sim {Math.round(s.similaridade_score)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function fmtBRL(v: number): string {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatTipoObra(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

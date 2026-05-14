/**
 * BenchmarkHistorico — análise estatística dos orçamentos passados.
 *
 * Mostra:
 *   - Cards de distribuição por tipo de obra (P25/Mediana/P75/Min/Max)
 *   - Tabela com todos orçamentos filtráveis
 *   - Filtros: tipo de obra, estágio, UF, período
 *
 * Acesso: orçamentista, gerente, diretor, admin.
 */
import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Filter, BarChart3 } from "lucide-react";
import {
  useBenchmarkOrcamentos,
  useBenchmarkDistribuicao,
  type BenchmarkFiltros,
} from "@/hooks/useBenchmark";

export default function BenchmarkHistorico() {
  const { canViewAppData, loading } = useAuth();
  const [filtros, setFiltros] = useState<BenchmarkFiltros>({});

  const { data: distribuicao, isLoading: dLoading } = useBenchmarkDistribuicao();
  const { data: orcamentos, isLoading: oLoading } = useBenchmarkOrcamentos(filtros);

  const tiposDeObra = useMemo(
    () => (distribuicao ?? []).map((d) => d.tipo_obra).filter((t) => t !== "sem_categoria"),
    [distribuicao]
  );

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto m-8" />;
  if (!canViewAppData) return <Navigate to="/" replace />;

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Benchmark Histórico
        </h1>
        <p className="page-subtitle">
          Análise estatística dos orçamentos passados — distribuição de preço por unidade, 
          prazos típicos, e taxa de conversão por tipo de obra.
        </p>
      </div>

      {/* Cards de distribuição por tipo de obra */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
          <TrendingUp className="w-4 h-4" />
          Distribuição por tipo de obra
        </div>
        {dLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(distribuicao ?? [])
            .filter((d) => d.tipo_obra !== "sem_categoria")
            .map((d) => (
              <Card key={d.tipo_obra}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{formatTipoObra(d.tipo_obra)}</CardTitle>
                  <CardDescription className="text-xs flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {d.total_orcamentos} orçamentos
                    </Badge>
                    {d.ganhos > 0 && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        {d.ganhos} ganhos
                      </Badge>
                    )}
                    {d.perdidos > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {d.perdidos} perdidos
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {d.preco_mediana && (
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <div>
                        <div className="text-muted-foreground">P25</div>
                        <div>{fmtBRL(d.preco_p25 ?? 0)}</div>
                      </div>
                      <div className="font-semibold">
                        <div className="text-muted-foreground">Mediana</div>
                        <div>{fmtBRL(d.preco_mediana ?? 0)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">P75</div>
                        <div>{fmtBRL(d.preco_p75 ?? 0)}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-1 border-t text-muted-foreground">
                    {d.prazo_medio_dias && (
                      <span>Prazo médio: {Math.round(d.prazo_medio_dias)} dias</span>
                    )}
                    {d.qtd_propriedades_media && (
                      <span>~{Math.round(d.qtd_propriedades_media)} propriedades</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          {distribuicao && distribuicao.filter((d) => d.tipo_obra !== "sem_categoria").length === 0 && (
            <Card className="md:col-span-3">
              <CardContent className="text-center text-sm text-muted-foreground italic py-8">
                Nenhum orçamento com tipo de obra cadastrado ainda. Crie e finalize orçamentos 
                via wizard para popular esta análise.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de obra</Label>
              <select
                className="w-full p-1.5 rounded border bg-background text-xs"
                value={filtros.tipo_obra ?? ""}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, tipo_obra: e.target.value || undefined }))
                }
              >
                <option value="">Todos</option>
                {tiposDeObra.map((t) => (
                  <option key={t} value={t}>
                    {formatTipoObra(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estágio</Label>
              <select
                className="w-full p-1.5 rounded border bg-background text-xs"
                value={filtros.estagio ?? ""}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, estagio: e.target.value || undefined }))
                }
              >
                <option value="">Todos</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
                <option value="proposta">Proposta</option>
                <option value="negociacao">Negociação</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">UF</Label>
              <Input
                maxLength={2}
                value={filtros.uf ?? ""}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    uf: e.target.value.toUpperCase() || undefined,
                  }))
                }
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano de</Label>
              <Input
                type="number"
                min="2020"
                max="2030"
                value={filtros.ano_de ?? ""}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, ano_de: Number(e.target.value) || undefined }))
                }
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano até</Label>
              <Input
                type="number"
                min="2020"
                max="2030"
                value={filtros.ano_ate ?? ""}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, ano_ate: Number(e.target.value) || undefined }))
                }
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de orçamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Orçamentos ({orcamentos?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {oLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {orcamentos && orcamentos.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              Nenhum orçamento corresponde aos filtros
            </p>
          )}
          {orcamentos && orcamentos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2">Cliente</th>
                    <th className="text-left py-2 px-2">Tipo</th>
                    <th className="text-right py-2 px-2">Qtd</th>
                    <th className="text-right py-2 px-2">Ext (km)</th>
                    <th className="text-right py-2 px-2">Dias</th>
                    <th className="text-right py-2 px-2">Preço total</th>
                    <th className="text-right py-2 px-2">Preço/un</th>
                    <th className="text-center py-2 px-2">Estágio</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentos.map((o) => (
                    <tr key={o.orcamento_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-1.5 px-2 truncate max-w-[200px]">
                        {o.cliente_nome ?? "—"}
                      </td>
                      <td className="py-1.5 px-2">
                        {formatTipoObra(
                          o.tipo_obra_parametros ?? o.tipo_obra_oportunidade ?? "—"
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {o.qtd_propriedades ?? "—"}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {o.extensao_km ? Number(o.extensao_km).toFixed(1) : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {o.dias_projeto ?? "—"}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-medium">
                        {fmtBRL(o.preco_total)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {o.preco_por_unidade > 0 ? fmtBRL(o.preco_por_unidade) : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {o.estagio_pipeline && (
                          <Badge
                            variant={
                              o.estagio_pipeline === "ganho"
                                ? "default"
                                : o.estagio_pipeline === "perdido"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {o.estagio_pipeline}
                          </Badge>
                        )}
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
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

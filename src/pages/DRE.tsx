import { useState, useMemo } from "react";
import { DollarSign, Info, ArrowUp, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

export default function DRE() {
  const { data: paramTributos } = useSupabaseQuery("parametros_tributos");
  const { data: paramAdminCentral } = useSupabaseQuery("parametros_admin_central");
  const { data: paramAdminLocal } = useSupabaseQuery("parametros_admin_local");
  const { data: paramFinanciamento } = useSupabaseQuery("parametros_financiamento");
  const { data: paramMargem } = useSupabaseQuery("parametros_margem");

  // Inputs do usuário
  const [custoDireto, setCustoDireto] = useState(850000);
  const [lucroLiquidoDesejado, setLucroLiquidoDesejado] = useState(100000);
  const [irpjPct, setIrpjPct] = useState(4.80);
  const [csllPct, setCsllPct] = useState(2.88);

  // Percentuais do banco
  const tributosReceita = useMemo(() => {
    return (paramTributos?.filter(t => t.ativo) || []).map(t => ({
      nome: String(t.nome),
      sigla: String(t.sigla),
      percentual: Number(t.percentual),
    }));
  }, [paramTributos]);

  const adminCentralPct = useMemo(() => {
    return (paramAdminCentral?.filter(p => p.ativo) || []).reduce((s, p) => s + Number(p.percentual), 0);
  }, [paramAdminCentral]);

  const adminLocalPct = useMemo(() => {
    return (paramAdminLocal?.filter(p => p.ativo) || []).reduce((s, p) => s + Number(p.percentual), 0);
  }, [paramAdminLocal]);

  const financiamentoPct = useMemo(() => {
    const fin = paramFinanciamento?.filter(p => p.ativo);
    return fin?.[0] ? Number(fin[0].percentual) : 1.5;
  }, [paramFinanciamento]);

  // Cálculo inverso da DRE
  const resultado = useMemo(() => {
    const totalTributosReceitaPct = tributosReceita.reduce((s, t) => s + t.percentual, 0);
    const totalIRPct = irpjPct + csllPct;

    // Despesas indiretas sobre custo direto
    const adminLocal = custoDireto * (adminLocalPct / 100);
    const adminCentral = custoDireto * (adminCentralPct / 100);
    const baseFinanciamento = custoDireto + adminLocal + adminCentral;
    const financiamento = baseFinanciamento * (financiamentoPct / 100);
    const totalDespesas = adminLocal + adminCentral + financiamento;

    // Caminho inverso:
    // Lucro Líquido = Lucro antes IR - IR
    // IR = Receita Bruta × (IRPJ% + CSLL%)
    // Lucro antes IR = Lucro Bruto - Despesas
    // Lucro Bruto = Receita Líquida - Custos Diretos
    // Receita Líquida = Receita Bruta - Tributos Receita
    // Receita Líquida = Receita Bruta × (1 - tributosReceita%)
    // 
    // Lucro Líquido = Receita Bruta × (1 - tributosReceita%) - custoDireto - totalDespesas - Receita Bruta × IR%
    // Lucro Líquido = Receita Bruta × (1 - tributosReceita% - IR%) - custoDireto - totalDespesas
    // Receita Bruta = (Lucro Líquido + custoDireto + totalDespesas) / (1 - tributosReceita% - IR%)

    const denominador = 1 - (totalTributosReceitaPct / 100) - (totalIRPct / 100);
    const receitaBruta = denominador > 0
      ? (lucroLiquidoDesejado + custoDireto + totalDespesas) / denominador
      : 0;

    const tributosTotal = receitaBruta * (totalTributosReceitaPct / 100);
    const receitaLiquida = receitaBruta - tributosTotal;
    const lucroBruto = receitaLiquida - custoDireto;
    const lucroAntesIR = lucroBruto - totalDespesas;
    const irpjValor = receitaBruta * (irpjPct / 100);
    const csllValor = receitaBruta * (csllPct / 100);
    const totalIR = irpjValor + csllValor;
    const lucroLiquidoFinal = lucroAntesIR - totalIR;

    const bdiValor = receitaBruta - custoDireto;
    const bdiPct = custoDireto > 0 ? (bdiValor / custoDireto) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquidoFinal / receitaBruta) * 100 : 0;
    const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
    const margemEbit = receitaBruta > 0 ? (lucroAntesIR / receitaBruta) * 100 : 0;

    return {
      receitaBruta,
      tributosReceita: tributosReceita.map(t => ({
        ...t,
        valor: receitaBruta * (t.percentual / 100),
      })),
      tributosTotal,
      totalTributosReceitaPct,
      receitaLiquida,
      custoDireto,
      lucroBruto,
      adminLocal,
      adminCentral,
      financiamento,
      totalDespesas,
      lucroAntesIR,
      irpjValor,
      csllValor,
      totalIR,
      totalIRPct,
      lucroLiquidoFinal,
      bdiPct,
      bdiValor,
      margemLiquida,
      margemBruta,
      margemEbit,
    };
  }, [custoDireto, lucroLiquidoDesejado, tributosReceita, adminCentralPct, adminLocalPct, financiamentoPct, irpjPct, csllPct]);

  type DreRow = {
    label: string;
    value: number;
    level: number;
    highlight?: boolean;
    accent?: boolean;
    pct?: number;
  };

  const dreRows: DreRow[] = [
    { label: "Receita Bruta (Preço de Venda)", value: resultado.receitaBruta, level: 0, highlight: true },
    { label: "(-) Tributos sobre Receita", value: -resultado.tributosTotal, level: 1, pct: resultado.totalTributosReceitaPct },
    ...resultado.tributosReceita.map(t => ({
      label: `${t.nome} (${t.sigla})`,
      value: -t.valor,
      level: 2,
      pct: t.percentual,
    })),
    { label: "(=) Receita Líquida", value: resultado.receitaLiquida, level: 0, highlight: true },
    { label: "(-) Custos Diretos", value: -resultado.custoDireto, level: 1 },
    { label: "(=) Lucro Bruto", value: resultado.lucroBruto, level: 0, highlight: true },
    { label: "(-) Despesas Operacionais", value: -resultado.totalDespesas, level: 1 },
    { label: `Administração Local (${fmtPct(adminLocalPct)})`, value: -resultado.adminLocal, level: 2 },
    { label: `Administração Central (${fmtPct(adminCentralPct)})`, value: -resultado.adminCentral, level: 2 },
    { label: `Financiamento (${fmtPct(financiamentoPct)})`, value: -resultado.financiamento, level: 2 },
    { label: "(=) Lucro antes do IR (EBIT)", value: resultado.lucroAntesIR, level: 0, highlight: true },
    { label: "(-) Impostos sobre o Lucro", value: -resultado.totalIR, level: 1, pct: resultado.totalIRPct },
    { label: `IRPJ`, value: -resultado.irpjValor, level: 2, pct: irpjPct },
    { label: `CSLL`, value: -resultado.csllValor, level: 2, pct: csllPct },
    { label: "(=) Lucro Líquido", value: resultado.lucroLiquidoFinal, level: 0, accent: true },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Formação de Preço por DRE</h1>
          <p className="page-subtitle">
            Defina o lucro líquido desejado e o sistema calcula o preço de venda necessário
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <ArrowUp className="w-4 h-4 text-primary" />
          Cálculo inverso: do lucro ao preço
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Parâmetros de Entrada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Custo Direto Total (R$)</Label>
                <Input
                  type="number"
                  value={custoDireto}
                  onChange={e => setCustoDireto(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <Separator />
              <div>
                <Label className="text-xs font-semibold text-primary">Lucro Líquido Desejado (R$)</Label>
                <Input
                  type="number"
                  value={lucroLiquidoDesejado}
                  onChange={e => setLucroLiquidoDesejado(parseFloat(e.target.value) || 0)}
                  className="mt-1 border-primary/50 focus:border-primary"
                />
              </div>
              <Separator />
              <div className="text-xs font-medium text-muted-foreground">Impostos sobre Lucro</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">IRPJ (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={irpjPct}
                    onChange={e => setIrpjPct(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">CSLL (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={csllPct}
                    onChange={e => setCsllPct(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indicadores */}
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">BDI Resultante</p>
              <p className="text-3xl font-bold text-primary font-mono">{fmtPct(resultado.bdiPct)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(resultado.bdiValor)} sobre {fmt(custoDireto)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Indicadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem Bruta</span>
                <span className="font-medium font-mono">{fmtPct(resultado.margemBruta)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem EBIT</span>
                <span className="font-medium font-mono">{fmtPct(resultado.margemEbit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem Líquida</span>
                <span className="font-medium font-mono text-primary">{fmtPct(resultado.margemLiquida)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo / Receita</span>
                <span className="font-medium font-mono">
                  {resultado.receitaBruta > 0 ? fmtPct((custoDireto / resultado.receitaBruta) * 100) : "0%"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carga Tributária Total</span>
                <span className="font-medium font-mono">
                  {fmtPct(resultado.totalTributosReceitaPct + resultado.totalIRPct)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DRE */}
        <div className="lg:col-span-2 bg-card rounded-lg border shadow-sm">
          <div className="p-5 border-b flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">DRE — Caminho Inverso</h2>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Preço calculado: {fmt(resultado.receitaBruta)}
            </span>
          </div>
          <div className="p-5">
            {dreRows.map((row, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between py-2.5 px-3 rounded-md ${
                  row.highlight
                    ? "bg-muted font-semibold"
                    : row.accent
                    ? "bg-primary/10 font-bold border border-primary/30"
                    : ""
                }`}
                style={{ paddingLeft: `${row.level * 24 + 12}px` }}
              >
                <span className={`text-sm ${row.level === 2 ? "text-muted-foreground" : ""}`}>
                  {row.label}
                </span>
                <div className="flex items-center gap-3">
                  {row.pct !== undefined && (
                    <span className="text-xs text-muted-foreground w-14 text-right">{fmtPct(row.pct)}</span>
                  )}
                  <span
                    className={`text-sm font-mono w-32 text-right ${
                      row.value < 0 ? "text-destructive" : ""
                    } ${row.accent ? "text-primary text-base" : ""}`}
                  >
                    {row.value < 0 ? "-" : ""}{fmt(Math.abs(row.value))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

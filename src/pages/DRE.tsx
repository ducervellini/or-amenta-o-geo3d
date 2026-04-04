import { useState, useMemo, useEffect } from "react";
import { DollarSign, ArrowUp, TrendingUp, Link2, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

interface BDIComp {
  sigla: string;
  label: string;
  percentual: number;
  descricao: string;
}

export default function DRE() {
  const [custoDireto, setCustoDireto] = useState(850000);
  const [lucroLiquidoPct, setLucroLiquidoPct] = useState(8);
  const [irpjPct, setIrpjPct] = useState(4.80);
  const [csllPct, setCsllPct] = useState(2.88);
  const [selectedBdiId, setSelectedBdiId] = useState<string>("");
  const [selectedOportunidadeId, setSelectedOportunidadeId] = useState<string>("");

  // Carregar BDIs salvos
  const { data: savedBdis } = useQuery({
    queryKey: ["parametros_bdi"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parametros_bdi")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Carregar oportunidades
  const { data: oportunidades } = useQuery({
    queryKey: ["oportunidades_dre"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("*, clientes(nome)")
        .eq("ativo", true)
        .order("codigo", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Carregar orçamento da oportunidade selecionada
  const { data: orcamentoOportunidade } = useQuery({
    queryKey: ["orcamento_oportunidade", selectedOportunidadeId],
    queryFn: async () => {
      if (!selectedOportunidadeId) return null;
      const { data, error } = await supabase
        .from("orcamentos")
        .select("*")
        .eq("oportunidade_id", selectedOportunidadeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOportunidadeId,
  });

  // Atualizar custo direto e BDI quando oportunidade muda
  const selectedOportunidade = oportunidades?.find((o) => o.id === selectedOportunidadeId);

  useMemo(() => {
    if (orcamentoOportunidade) {
      setCustoDireto(Number(orcamentoOportunidade.custo_total) || 0);
      if (orcamentoOportunidade.bdi_id) {
        setSelectedBdiId(orcamentoOportunidade.bdi_id);
      }
    }
  }, [orcamentoOportunidade]);

  // Componentes do BDI selecionado
  const bdiComponentes = useMemo((): BDIComp[] => {
    if (!selectedBdiId || !savedBdis) return [];
    const bdi = savedBdis.find((b: any) => b.id === selectedBdiId);
    if (!bdi) return [];
    const comp = bdi.componentes as Record<string, any>;
    return Object.entries(comp).map(([sigla, val]: [string, any]) => ({
      sigla,
      label: val?.label || sigla,
      percentual: Number(val?.percentual ?? 0),
      descricao: val?.descricao || "",
    }));
  }, [selectedBdiId, savedBdis]);

  const selectedBdi = savedBdis?.find((b: any) => b.id === selectedBdiId);

  // Categorizar componentes do BDI
  const categorias = useMemo(() => {
    const TRIBUTOS_SIGLAS = ["PIS", "COFINS", "ISS", "CPRB", "ICMS"];
    const tributos: BDIComp[] = [];
    const despesas: BDIComp[] = [];
    let lucroComp: BDIComp | null = null;
    let riscoComp: BDIComp | null = null;
    let comissaoComp: BDIComp | null = null;

    for (const c of bdiComponentes) {
      const s = c.sigla.toUpperCase();
      const l = c.label.toUpperCase();
      if (s === "L" || l.includes("LUCRO")) {
        lucroComp = c;
      } else if (s === "R" || l.includes("RISCO")) {
        riscoComp = c;
      } else if (s === "COM" || l.includes("COMISS")) {
        comissaoComp = c;
      } else if (TRIBUTOS_SIGLAS.includes(s) || l.includes("TRIBUT") || l.includes("IMPOSTO")) {
        tributos.push(c);
      } else {
        despesas.push(c);
      }
    }
    return { tributos, despesas, lucroComp, riscoComp, comissaoComp };
  }, [bdiComponentes]);

  // Cálculo inverso da DRE
  const resultado = useMemo(() => {
    const totalTributosPct = categorias.tributos.reduce((s, t) => s + t.percentual, 0);
    const totalIRPct = irpjPct + csllPct;
    const comissaoPct = categorias.comissaoComp?.percentual || 0;

    // Despesas BDI aplicadas sobre custo direto
    const despesasDetail = categorias.despesas.map(d => ({
      ...d,
      valor: custoDireto * (d.percentual / 100),
    }));
    const riscoPct = categorias.riscoComp?.percentual || 0;
    const riscoValor = custoDireto * (riscoPct / 100);
    const totalDespesasPct = categorias.despesas.reduce((s, d) => s + d.percentual, 0) + riscoPct + comissaoPct;
    const totalDespesas = despesasDetail.reduce((s, d) => s + d.valor, 0) + riscoValor + custoDireto * (comissaoPct / 100);

    // Caminho inverso:
    // Lucro Líquido = Receita Bruta × lucroLiquidoPct%
    // Receita Bruta × (1 - tributos% - IR%) - custoDireto - totalDespesas = Receita Bruta × lucroLiquidoPct%
    // Receita Bruta = (custoDireto + totalDespesas) / (1 - tributos% - IR% - lucroLiquidoPct%)
    const denominador = 1 - (totalTributosPct / 100) - (totalIRPct / 100) - (lucroLiquidoPct / 100);
    const receitaBruta = denominador > 0
      ? (custoDireto + totalDespesas) / denominador
      : 0;

    const tributosTotal = receitaBruta * (totalTributosPct / 100);
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
      tributosReceita: categorias.tributos.map(t => ({
        ...t,
        valor: receitaBruta * (t.percentual / 100),
      })),
      tributosTotal,
      totalTributosPct,
      receitaLiquida,
      custoDireto,
      lucroBruto,
      despesasDetail,
      riscoValor,
      riscoPct,
      comissaoValor: custoDireto * (comissaoPct / 100),
      comissaoPct,
      totalDespesas,
      totalDespesasPct,
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
  }, [custoDireto, lucroLiquidoPct, categorias, irpjPct, csllPct]);

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
    // Tributos sobre receita
    ...(resultado.tributosReceita.length > 0 ? [
      { label: "(-) Tributos sobre Receita", value: -resultado.tributosTotal, level: 1, pct: resultado.totalTributosPct },
      ...resultado.tributosReceita.map(t => ({
        label: `${t.label} (${t.sigla})`,
        value: -t.valor,
        level: 2,
        pct: t.percentual,
      })),
    ] : []),
    { label: "(=) Receita Líquida", value: resultado.receitaLiquida, level: 0, highlight: true },
    { label: "(-) Custos Diretos", value: -resultado.custoDireto, level: 1 },
    { label: "(=) Lucro Bruto", value: resultado.lucroBruto, level: 0, highlight: true },
    // Despesas operacionais do BDI
    { label: "(-) Despesas Operacionais", value: -resultado.totalDespesas, level: 1, pct: resultado.totalDespesasPct },
    ...resultado.despesasDetail.map(d => ({
      label: `${d.label}`,
      value: -d.valor,
      level: 2,
      pct: d.percentual,
    })),
    ...(resultado.riscoPct > 0 ? [{
      label: categorias.riscoComp?.label || "Risco",
      value: -resultado.riscoValor,
      level: 2,
      pct: resultado.riscoPct,
    }] : []),
    ...(resultado.comissaoPct > 0 ? [{
      label: categorias.comissaoComp?.label || "Comissões",
      value: -resultado.comissaoValor,
      level: 2,
      pct: resultado.comissaoPct,
    }] : []),
    { label: "(=) Lucro antes do IR (EBIT)", value: resultado.lucroAntesIR, level: 0, highlight: true },
    { label: "(-) Impostos sobre o Lucro", value: -resultado.totalIR, level: 1, pct: resultado.totalIRPct },
    { label: "IRPJ", value: -resultado.irpjValor, level: 2, pct: irpjPct },
    { label: "CSLL", value: -resultado.csllValor, level: 2, pct: csllPct },
    { label: "(=) Lucro Líquido", value: resultado.lucroLiquidoFinal, level: 0, accent: true, pct: resultado.margemLiquida },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Formação de Preço por DRE</h1>
          <p className="page-subtitle">
            Defina o lucro líquido desejado e o sistema calcula o preço de venda com base no BDI
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
          {/* Seleção do BDI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Configuração BDI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Selecione o BDI</Label>
                <Select value={selectedBdiId} onValueChange={setSelectedBdiId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolha uma configuração BDI" />
                  </SelectTrigger>
                  <SelectContent>
                    {(savedBdis || []).map((bdi: any) => (
                      <SelectItem key={bdi.id} value={bdi.id}>
                        {bdi.nome} ({Number(bdi.bdi_calculado).toFixed(2)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBdi && (
                <div className="bg-muted/50 rounded-md p-3 space-y-1">
                  <div className="text-xs font-medium">{selectedBdi.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    BDI: {Number(selectedBdi.bdi_calculado).toFixed(2)}% — {bdiComponentes.length} componentes
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {bdiComponentes.map(c => (
                      <Badge key={c.sigla} variant="outline" className="text-[10px]">
                        {c.sigla} {c.percentual.toFixed(2)}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {!selectedBdiId && (
                <p className="text-xs text-muted-foreground italic">
                  Selecione um BDI salvo para vincular os componentes à DRE
                </p>
              )}
            </CardContent>
          </Card>

          {/* Seleção da Oportunidade */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Oportunidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Selecione a Oportunidade</Label>
                <Select value={selectedOportunidadeId} onValueChange={setSelectedOportunidadeId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Vincular oportunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(oportunidades || []).map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.codigo} — {op.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedOportunidade && (
                <div className="bg-muted/50 rounded-md p-3 space-y-1">
                  <div className="text-xs font-medium">{selectedOportunidade.codigo} — {selectedOportunidade.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    Cliente: {(selectedOportunidade as any).clientes?.nome || "—"}
                  </div>
                  {selectedOportunidade.cidade && (
                    <div className="text-xs text-muted-foreground">
                      Local: {selectedOportunidade.cidade}{selectedOportunidade.estado ? ` / ${selectedOportunidade.estado}` : ""}
                    </div>
                  )}
                  {orcamentoOportunidade && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Custo Total Orçamento: {fmt(Number(orcamentoOportunidade.custo_total))}
                    </div>
                  )}
                  {!orcamentoOportunidade && (
                    <div className="text-xs text-destructive mt-1">
                      Nenhum orçamento encontrado para esta oportunidade
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Parâmetros</CardTitle>
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
                <Label className="text-xs font-semibold text-primary">Lucro Líquido Desejado (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={lucroLiquidoPct}
                    onChange={e => setLucroLiquidoPct(parseFloat(e.target.value) || 0)}
                    className="border-primary/50 focus:border-primary"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">% sobre a receita bruta</p>
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
                <span className="text-muted-foreground">Carga Tributária</span>
                <span className="font-medium font-mono">
                  {fmtPct(resultado.totalTributosPct + resultado.totalIRPct)}
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
            {selectedBdi && (
              <Badge variant="secondary" className="text-xs ml-2">
                <Link2 className="w-3 h-3 mr-1" />
                {selectedBdi.nome}
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Preço: {fmt(resultado.receitaBruta)}
            </span>
          </div>
          <div className="p-5">
            {!selectedBdiId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Link2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Selecione uma configuração BDI</p>
                <p className="text-xs mt-1">A DRE será gerada com os componentes do BDI selecionado</p>
              </div>
            ) : (
              dreRows.map((row, idx) => (
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

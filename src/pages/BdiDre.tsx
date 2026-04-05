import { useState, useMemo, useEffect } from "react";
import {
  Calculator, Save, Info, Trash2, Edit, DollarSign,
  TrendingUp, Link2, Briefcase, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

// ── BDI types & defaults ──

interface BDIItem {
  label: string;
  sigla: string;
  percentual: number;
  descricao: string;
}

const defaultBDI: BDIItem[] = [
  { label: "Administração Central", sigla: "AC", percentual: 4.00, descricao: "Custos indiretos da sede" },
  { label: "Seguro e Garantia", sigla: "S+G", percentual: 0.80, descricao: "Seguros e garantias contratuais" },
  { label: "Risco", sigla: "R", percentual: 1.27, descricao: "Margem de risco do empreendimento" },
  { label: "Despesas Financeiras", sigla: "DF", percentual: 1.23, descricao: "Custo financeiro do capital" },
  { label: "Comissões", sigla: "COM", percentual: 0.00, descricao: "Comissões sobre venda ou intermediação" },
  { label: "Lucro", sigla: "L", percentual: 7.40, descricao: "Margem de lucro bruto" },
  { label: "PIS", sigla: "PIS", percentual: 0.65, descricao: "Programa de Integração Social" },
  { label: "COFINS", sigla: "COFINS", percentual: 3.00, descricao: "Contrib. p/ Financiamento da Seg. Social" },
  { label: "ISS", sigla: "ISS", percentual: 3.00, descricao: "Imposto Sobre Serviços" },
  { label: "CPRB", sigla: "CPRB", percentual: 0.00, descricao: "Contribuição Previdenciária s/ Receita Bruta" },
];

const TRIBUTOS_SIGLAS = ["PIS", "COFINS", "ISS", "CPRB", "ICMS"];

function calcBdi(items: BDIItem[]) {
  const ac = items.find((i) => i.sigla === "AC")?.percentual || 0;
  const sg = items.find((i) => i.sigla === "S+G")?.percentual || 0;
  const r = items.find((i) => i.sigla === "R")?.percentual || 0;
  const df = items.find((i) => i.sigla === "DF")?.percentual || 0;
  const com = items.find((i) => i.sigla === "COM")?.percentual || 0;
  const l = items.find((i) => i.sigla === "L")?.percentual || 0;
  const tributos = items
    .filter((i) => TRIBUTOS_SIGLAS.includes(i.sigla))
    .reduce((sum, i) => sum + i.percentual, 0);
  const bdiCalc =
    ((1 + (ac + sg + r) / 100) * (1 + df / 100) * (1 + com / 100) * (1 + l / 100)) /
      (1 - tributos / 100) -
    1;
  return { bdiCalc, bdiPercent: bdiCalc * 100, ac, sg, r, df, com, l, tributos };
}

// ══════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════

export default function BdiDre() {
  const queryClient = useQueryClient();

  // ── BDI state ──
  const [bdiItems, setBdiItems] = useState<BDIItem[]>(defaultBDI);
  const [bdiNome, setBdiNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ── DRE state ──
  const [custoDireto, setCustoDireto] = useState(0);
  const [lucroLiquidoPct, setLucroLiquidoPct] = useState(8);
  const [irpjPct, setIrpjPct] = useState(4.80);
  const [csllPct, setCsllPct] = useState(2.88);

  // ── Queries ──

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

  const { data: oportunidades } = useQuery({
    queryKey: ["oportunidades_bdi_dre"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("*, clientes(nome)")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latestOportunidade = oportunidades?.[0];
  const selectedOportunidadeId = latestOportunidade?.id || "";

  const { data: orcamentoOportunidade } = useQuery({
    queryKey: ["orcamento_oportunidade_bdi", selectedOportunidadeId],
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

  useEffect(() => {
    if (orcamentoOportunidade) {
      setCustoDireto(Number(orcamentoOportunidade.custo_total) || 0);
    }
  }, [orcamentoOportunidade]);

  // ── BDI calculations (live from current items) ──
  const { bdiCalc, bdiPercent, ac, sg, r, df, com, l, tributos } = calcBdi(bdiItems);

  const handleBdiChange = (index: number, value: string) => {
    const updated = [...bdiItems];
    updated[index] = { ...updated[index], percentual: parseFloat(value) || 0 };
    setBdiItems(updated);
  };

  const handleBdiSave = async () => {
    if (!bdiNome.trim()) return toast.error("Informe um nome para a configuração");
    setSaving(true);
    try {
      const componentes = bdiItems.reduce((acc, i) => {
        acc[i.sigla] = { label: i.label, percentual: i.percentual, descricao: i.descricao };
        return acc;
      }, {} as Record<string, any>);

      if (editId) {
        const { error } = await (supabase.from as any)("parametros_bdi")
          .update({ nome: bdiNome.trim(), componentes, bdi_calculado: bdiPercent })
          .eq("id", editId);
        if (error) throw error;
        toast.success("BDI atualizado!");
        setEditId(null);
      } else {
        const { error } = await (supabase.from as any)("parametros_bdi")
          .insert({ nome: bdiNome.trim(), componentes, bdi_calculado: bdiPercent });
        if (error) throw error;
        toast.success("BDI salvo!");
      }
      setBdiNome("");
      queryClient.invalidateQueries({ queryKey: ["parametros_bdi"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBdiLoad = (bdi: any) => {
    const comp = bdi.componentes as Record<string, any>;
    const loaded = defaultBDI.map((d) => ({
      ...d,
      percentual: comp[d.sigla]?.percentual ?? d.percentual,
      label: comp[d.sigla]?.label ?? d.label,
      descricao: comp[d.sigla]?.descricao ?? d.descricao,
    }));
    const existingSiglas = new Set(defaultBDI.map(d => d.sigla));
    const extras = Object.entries(comp)
      .filter(([sigla]) => !existingSiglas.has(sigla))
      .map(([sigla, val]: [string, any]) => ({
        label: val?.label || sigla,
        sigla,
        percentual: val?.percentual ?? 0,
        descricao: val?.descricao || "",
      }));
    setBdiItems([...loaded, ...extras]);
    setBdiNome(bdi.nome);
    setEditId(bdi.id);
  };

  const handleBdiDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("parametros_bdi")
      .update({ ativo: false })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração removida");
      if (editId === id) { setEditId(null); setBdiNome(""); }
      queryClient.invalidateQueries({ queryKey: ["parametros_bdi"] });
    }
  };

  // ── DRE calculations (live from current BDI items) ──

  const categorias = useMemo(() => {
    const tributosList: BDIItem[] = [];
    const despesas: BDIItem[] = [];
    let lucroComp: BDIItem | null = null;
    let riscoComp: BDIItem | null = null;
    let comissaoComp: BDIItem | null = null;

    for (const c of bdiItems) {
      const s = c.sigla.toUpperCase();
      const lab = c.label.toUpperCase();
      if (s === "L" || lab.includes("LUCRO")) lucroComp = c;
      else if (s === "R" || lab.includes("RISCO")) riscoComp = c;
      else if (s === "COM" || lab.includes("COMISS")) comissaoComp = c;
      else if (TRIBUTOS_SIGLAS.includes(s) || lab.includes("TRIBUT") || lab.includes("IMPOSTO")) tributosList.push(c);
      else despesas.push(c);
    }
    return { tributos: tributosList, despesas, lucroComp, riscoComp, comissaoComp };
  }, [bdiItems]);

  const resultado = useMemo(() => {
    const totalTributosPct = categorias.tributos.reduce((s, t) => s + t.percentual, 0);
    const totalIRPct = irpjPct + csllPct;
    const comissaoPct = categorias.comissaoComp?.percentual || 0;

    const despesasDetail = categorias.despesas.map(d => ({
      ...d,
      valor: custoDireto * (d.percentual / 100),
    }));
    const riscoPct = categorias.riscoComp?.percentual || 0;
    const riscoValor = custoDireto * (riscoPct / 100);
    const totalDespesasPct = categorias.despesas.reduce((s, d) => s + d.percentual, 0) + riscoPct + comissaoPct;
    const totalDespesas = despesasDetail.reduce((s, d) => s + d.valor, 0) + riscoValor + custoDireto * (comissaoPct / 100);

    const denominador = 1 - (totalTributosPct / 100) - (totalIRPct / 100) - (lucroLiquidoPct / 100);
    const receitaBruta = denominador > 0 ? (custoDireto + totalDespesas) / denominador : 0;

    const tributosTotal = receitaBruta * (totalTributosPct / 100);
    const receitaLiquida = receitaBruta - tributosTotal;
    const lucroBruto = receitaLiquida - custoDireto;
    const lucroAntesIR = lucroBruto - totalDespesas;
    const irpjValor = receitaBruta * (irpjPct / 100);
    const csllValor = receitaBruta * (csllPct / 100);
    const totalIR = irpjValor + csllValor;
    const lucroLiquidoFinal = lucroAntesIR - totalIR;
    const bdiValor = receitaBruta - custoDireto;
    const bdiPctCalc = custoDireto > 0 ? (bdiValor / custoDireto) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquidoFinal / receitaBruta) * 100 : 0;
    const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
    const margemEbit = receitaBruta > 0 ? (lucroAntesIR / receitaBruta) * 100 : 0;

    return {
      receitaBruta, tributosReceita: categorias.tributos.map(t => ({ ...t, valor: receitaBruta * (t.percentual / 100) })),
      tributosTotal, totalTributosPct, receitaLiquida, custoDireto, lucroBruto,
      despesasDetail, riscoValor, riscoPct,
      comissaoValor: custoDireto * (comissaoPct / 100), comissaoPct,
      totalDespesas, totalDespesasPct, lucroAntesIR,
      irpjValor, csllValor, totalIR, totalIRPct,
      lucroLiquidoFinal, bdiPct: bdiPctCalc, bdiValor,
      margemLiquida, margemBruta, margemEbit,
    };
  }, [custoDireto, lucroLiquidoPct, categorias, irpjPct, csllPct]);

  type DreRow = { label: string; value: number; level: number; highlight?: boolean; accent?: boolean; pct?: number };

  const dreRows: DreRow[] = [
    { label: "Receita Bruta (Preço de Venda)", value: resultado.receitaBruta, level: 0, highlight: true },
    ...(resultado.tributosReceita.length > 0 ? [
      { label: "(-) Tributos sobre Receita", value: -resultado.tributosTotal, level: 1, pct: resultado.totalTributosPct },
      ...resultado.tributosReceita.map(t => ({ label: `${t.label} (${t.sigla})`, value: -t.valor, level: 2, pct: t.percentual })),
    ] : []),
    { label: "(=) Receita Líquida", value: resultado.receitaLiquida, level: 0, highlight: true },
    { label: "(-) Custos Diretos", value: -resultado.custoDireto, level: 1 },
    { label: "(=) Lucro Bruto", value: resultado.lucroBruto, level: 0, highlight: true },
    { label: "(-) Despesas Operacionais", value: -resultado.totalDespesas, level: 1, pct: resultado.totalDespesasPct },
    ...resultado.despesasDetail.map(d => ({ label: d.label, value: -d.valor, level: 2, pct: d.percentual })),
    ...(resultado.riscoPct > 0 ? [{ label: categorias.riscoComp?.label || "Risco", value: -resultado.riscoValor, level: 2, pct: resultado.riscoPct }] : []),
    ...(resultado.comissaoPct > 0 ? [{ label: categorias.comissaoComp?.label || "Comissões", value: -resultado.comissaoValor, level: 2, pct: resultado.comissaoPct }] : []),
    { label: "(=) Lucro antes do IR (EBIT)", value: resultado.lucroAntesIR, level: 0, highlight: true },
    { label: "(-) Impostos sobre o Lucro", value: -resultado.totalIR, level: 1, pct: resultado.totalIRPct },
    { label: "IRPJ", value: -resultado.irpjValor, level: 2, pct: irpjPct },
    { label: "CSLL", value: -resultado.csllValor, level: 2, pct: csllPct },
    { label: "(=) Lucro Líquido", value: resultado.lucroLiquidoFinal, level: 0, accent: true, pct: resultado.margemLiquida },
  ];

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">BDI & Formação de Preço</h1>
          <p className="page-subtitle">
            Configure o BDI e veja a DRE se formar automaticamente
          </p>
        </div>
        {latestOportunidade && (
          <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Oportunidade:</span>
            <span className="font-semibold">{latestOportunidade.codigo}</span>
            {orcamentoOportunidade && (
              <Badge variant="outline" className="text-[10px]">
                {fmt(Number(orcamentoOportunidade.custo_total))}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ── Main layout: BDI left, DRE right ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ══════════ LEFT: BDI Configuration ══════════ */}
        <div className="space-y-4">
          {/* Load saved config */}
          {(savedBdis || []).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Carregar Configuração Salva
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(savedBdis || []).map((bdi: any) => (
                    <div
                      key={bdi.id}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/80 ${
                        editId === bdi.id ? "border-primary bg-primary/5" : "bg-card"
                      }`}
                    >
                      <div className="flex-1" onClick={() => handleBdiLoad(bdi)}>
                        <p className="text-xs font-medium">{bdi.nome}</p>
                        <p className="text-[10px] text-muted-foreground">BDI: {Number(bdi.bdi_calculado).toFixed(2)}%</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleBdiDelete(bdi.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* BDI components editor */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold">Componentes do BDI</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-accent/10 text-accent px-3 py-1 rounded-full">
                  <span className="text-sm font-bold">{bdiPercent.toFixed(2)}%</span>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {bdiItems.map((item, idx) => (
                <div key={item.sigla} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                  <span className="text-[10px] font-bold text-accent uppercase w-12 text-center shrink-0">{item.sigla}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      value={item.percentual}
                      onChange={(e) => handleBdiChange(idx, e.target.value)}
                      className="w-20 px-2 py-1.5 text-xs text-right bg-background border rounded-md focus:ring-2 focus:ring-ring outline-none"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Save section */}
            <div className="p-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nome da configuração (ex: BDI Padrão)"
                  value={bdiNome}
                  onChange={(e) => setBdiNome(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button size="sm" className="gap-1.5 shrink-0" onClick={handleBdiSave} disabled={saving}>
                  <Save className="w-3.5 h-3.5" />
                  {editId ? "Atualizar" : "Salvar"}
                </Button>
                {editId && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditId(null); setBdiNome(""); setBdiItems(defaultBDI); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Formula reference */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground">Fórmula BDI</h3>
              </div>
              <div className="bg-muted rounded-md p-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
                BDI = [(1+AC+S+R+G) × (1+DF) × (1+COM) × (1+L)] / (1-I) - 1
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Fator multiplicador: <span className="font-mono font-medium">{(1 + bdiCalc).toFixed(4)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══════════ RIGHT: DRE (auto-generated from BDI) ══════════ */}
        <div className="space-y-4">
          {/* DRE parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Parâmetros da DRE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Custo Direto (R$)</Label>
                  <Input
                    type="number"
                    value={custoDireto}
                    onChange={e => setCustoDireto(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-primary">Lucro Líquido (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={lucroLiquidoPct}
                    onChange={e => setLucroLiquidoPct(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8 text-xs border-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">IRPJ (%)</Label>
                    <Input type="number" step="0.01" value={irpjPct} onChange={e => setIrpjPct(parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">CSLL (%)</Label>
                    <Input type="number" step="0.01" value={csllPct} onChange={e => setCsllPct(parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Preço de Venda</p>
              <p className="text-sm font-bold font-mono text-primary">{fmt(resultado.receitaBruta)}</p>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">BDI Resultante</p>
              <p className="text-sm font-bold font-mono text-accent">{fmtPct(resultado.bdiPct)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center border ${
              resultado.lucroLiquidoFinal >= 0
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-destructive/10 border-destructive/30"
            }`}>
              <p className="text-[10px] text-muted-foreground">Lucro Líquido</p>
              <p className={`text-sm font-bold font-mono ${
                resultado.lucroLiquidoFinal >= 0 ? "text-emerald-600" : "text-destructive"
              }`}>
                {fmt(resultado.lucroLiquidoFinal)}
              </p>
              <p className="text-[10px] text-muted-foreground">{fmtPct(resultado.margemLiquida)}</p>
            </div>
          </div>

          {/* DRE table */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold">DRE — Formação de Preço</h2>
              <ArrowRight className="w-4 h-4 text-muted-foreground mx-1" />
              <span className="text-xs text-muted-foreground">Atualização em tempo real</span>
            </div>
            <div className="p-4">
              {dreRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-2 px-3 rounded-md ${
                    row.highlight ? "bg-muted font-semibold" : row.accent ? "bg-primary/10 font-bold border border-primary/30" : ""
                  }`}
                  style={{ paddingLeft: `${row.level * 20 + 12}px` }}
                >
                  <span className={`text-xs ${row.level === 2 ? "text-muted-foreground" : ""}`}>{row.label}</span>
                  <div className="flex items-center gap-3">
                    {row.pct !== undefined && (
                      <span className="text-[10px] text-muted-foreground w-12 text-right">{fmtPct(row.pct)}</span>
                    )}
                    <span className={`text-xs font-mono w-28 text-right ${row.value < 0 ? "text-destructive" : ""} ${row.accent ? "text-primary text-sm" : ""}`}>
                      {row.value < 0 ? "-" : ""}{fmt(Math.abs(row.value))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicators */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Margem Bruta</p>
                  <p className="font-mono font-semibold">{fmtPct(resultado.margemBruta)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Margem EBIT</p>
                  <p className="font-mono font-semibold">{fmtPct(resultado.margemEbit)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Margem Líquida</p>
                  <p className="font-mono font-semibold text-primary">{fmtPct(resultado.margemLiquida)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Carga Tributária</p>
                  <p className="font-mono font-semibold">{fmtPct(resultado.totalTributosPct + resultado.totalIRPct)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calculator, Save, Info, Trash2, DollarSign,
  TrendingUp, Link2, Briefcase, ArrowRight, RefreshCw,
} from "lucide-react";
import { VoltarAoOrcamento } from "@/components/orcamento/VoltarAoOrcamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

// ── Types ──

interface BDIItem {
  label: string;
  sigla: string;
  percentual: number;
  descricao: string;
  categoria: "despesa" | "tributo" | "lucro" | "risco" | "comissao" | "ir";
}

const CATEGORIAS_ORDER: BDIItem["categoria"][] = ["despesa", "risco", "comissao", "lucro", "tributo", "ir"];
const CATEGORIA_LABELS: Record<string, string> = {
  despesa: "Despesas Indiretas",
  risco: "Risco",
  comissao: "Comissões",
  lucro: "Lucro Bruto",
  tributo: "Tributos sobre Receita",
  ir: "Impostos sobre Lucro",
};

const defaultBDI: BDIItem[] = [
  { label: "Administração Central", sigla: "AC", percentual: 4.00, descricao: "Custos indiretos da sede", categoria: "despesa" },
  { label: "Seguros, Garantias e ART", sigla: "S+G", percentual: 0.80, descricao: "Seguros, garantias e ART contratuais", categoria: "despesa" },
  { label: "Despesas Financeiras", sigla: "DF", percentual: 1.23, descricao: "Custo financeiro do capital", categoria: "despesa" },
  { label: "Risco", sigla: "R", percentual: 1.27, descricao: "Margem de risco do empreendimento", categoria: "risco" },
  { label: "Comissões", sigla: "COM", percentual: 0.00, descricao: "Comissões sobre venda", categoria: "comissao" },
  { label: "Lucro", sigla: "L", percentual: 7.40, descricao: "Margem de lucro bruto", categoria: "lucro" },
  { label: "PIS", sigla: "PIS", percentual: 0.65, descricao: "Programa de Integração Social", categoria: "tributo" },
  { label: "COFINS", sigla: "COFINS", percentual: 3.00, descricao: "Contrib. p/ Financiamento da Seg. Social", categoria: "tributo" },
  { label: "ISS", sigla: "ISS", percentual: 3.00, descricao: "Imposto Sobre Serviços", categoria: "tributo" },
  
  { label: "IRPJ", sigla: "IRPJ", percentual: 4.80, descricao: "Imposto de Renda (Lucro Presumido)", categoria: "ir" },
  { label: "CSLL", sigla: "CSLL", percentual: 2.88, descricao: "Contrib. Social sobre Lucro Líquido", categoria: "ir" },
];

// ── Calculation engine ──

function calcAll(items: BDIItem[], custoDireto: number) {
  // Categorize
  const byCategoria = (cat: BDIItem["categoria"]) => items.filter(i => i.categoria === cat);
  const despesas = byCategoria("despesa");
  const riscos = byCategoria("risco");
  const comissoes = byCategoria("comissao");
  const lucroItems = byCategoria("lucro");
  const tributos = byCategoria("tributo");
  const irItems = byCategoria("ir");

  // Percentuais
  const despesasPct = despesas.reduce((s, d) => s + d.percentual, 0);
  const riscoPct = riscos.reduce((s, d) => s + d.percentual, 0);
  const comissaoPct = comissoes.reduce((s, d) => s + d.percentual, 0);
  const lucroBrutoPct = lucroItems.reduce((s, d) => s + d.percentual, 0);
  const tributosPct = tributos.reduce((s, d) => s + d.percentual, 0);
  const irPct = irItems.reduce((s, d) => s + d.percentual, 0);

  // BDI multiplicativo: [(1+AC+S+R) × (1+DF) × (1+COM) × (1+L)] / (1-I) - 1
  const ac = items.find(i => i.sigla === "AC")?.percentual || 0;
  const sg = items.find(i => i.sigla === "S+G")?.percentual || 0;
  const r = riscoPct;
  const df = items.find(i => i.sigla === "DF")?.percentual || 0;
  const com = comissaoPct;
  const l = lucroBrutoPct;
  const totalI = tributosPct;

  const bdiCalc =
    ((1 + (ac + sg + r) / 100) * (1 + df / 100) * (1 + com / 100) * (1 + l / 100)) /
    (1 - totalI / 100) - 1;
  const bdiPercent = bdiCalc * 100;
  const fatorMultiplicador = 1 + bdiCalc;

  // DRE: Preço = (CD + Despesas) / (1 - Tributos% - IR% - LucroLiq%)
  // Despesas sobre CD
  const totalDespesasSobreCDPct = despesasPct + riscoPct + comissaoPct;
  const totalDespesasValor = custoDireto * (totalDespesasSobreCDPct / 100);

  // O lucro líquido desejado é derivado: L(bruto) - IR = LucroLíquido (sobre receita)
  // Primeiro calculamos receita bruta usando a fórmula inversa
  const denominador = 1 - (tributosPct / 100) - (irPct / 100) - (lucroBrutoPct / 100);
  const receitaBruta = denominador > 0 ? (custoDireto + totalDespesasValor) / denominador : 0;

  // DRE detalhada
  const tributosValorDetail = tributos.map(t => ({
    ...t,
    valor: receitaBruta * (t.percentual / 100),
  }));
  const tributosTotal = tributosValorDetail.reduce((s, t) => s + t.valor, 0);
  const receitaLiquida = receitaBruta - tributosTotal;
  const lucroBruto = receitaLiquida - custoDireto;

  const despesasDetail = despesas.map(d => ({
    ...d,
    valor: custoDireto * (d.percentual / 100),
  }));
  const riscoValor = custoDireto * (riscoPct / 100);
  const comissaoValor = custoDireto * (comissaoPct / 100);

  const lucroAntesIR = lucroBruto - totalDespesasValor;

  const irDetail = irItems.map(i => ({
    ...i,
    valor: receitaBruta * (i.percentual / 100),
  }));
  const irTotal = irDetail.reduce((s, i) => s + i.valor, 0);
  const lucroLiquido = lucroAntesIR - irTotal;

  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
  const margemEbit = receitaBruta > 0 ? (lucroAntesIR / receitaBruta) * 100 : 0;
  const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  const bdiValor = receitaBruta - custoDireto;
  const bdiResultante = custoDireto > 0 ? (bdiValor / custoDireto) * 100 : 0;
  const cargaTributaria = tributosPct + irPct;

  return {
    bdiPercent, bdiCalc, fatorMultiplicador,
    receitaBruta, tributosValorDetail, tributosTotal, tributosPct,
    receitaLiquida, custoDireto, lucroBruto,
    despesasDetail, despesasPct, riscoValor, riscoPct, comissaoValor, comissaoPct,
    totalDespesasValor, totalDespesasSobreCDPct,
    lucroAntesIR, lucroBrutoPct,
    irDetail, irTotal, irPct,
    lucroLiquido, margemBruta, margemEbit, margemLiquida,
    bdiResultante, bdiValor, cargaTributaria,
    riscos, comissoes, lucroItems,
  };
}

// ══════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════

export default function BdiDre() {
  return <BdiDreContent />;
}

export function BdiDreContent({
  embedded = false,
  oportunidadeId,
}: {
  embedded?: boolean;
  oportunidadeId?: string;
} = {}) {
  const queryClient = useQueryClient();

  const [bdiItems, setBdiItems] = useState<BDIItem[]>(defaultBDI);
  const [bdiNome, setBdiNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [custoDireto, setCustoDireto] = useState(0);
  const [lucroLiqDesejado, setLucroLiqDesejado] = useState<number | null>(null);

  // ── Queries ──
  const { data: savedBdis } = useQuery({
    queryKey: ["parametros_bdi"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("parametros_bdi")
        .select("*").eq("ativo", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: oportunidades } = useQuery({
    queryKey: ["oportunidades_bdi_dre", oportunidadeId],
    queryFn: async () => {
      if (oportunidadeId) {
        const { data, error } = await supabase
          .from("oportunidades").select("*, clientes(nome)")
          .eq("id", oportunidadeId).eq("ativo", true);
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("oportunidades").select("*, clientes(nome)")
        .eq("ativo", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latestOportunidade = oportunidades?.[0];

  const { data: orcamentoOportunidade } = useQuery({
    queryKey: ["orcamento_oportunidade_bdi", latestOportunidade?.id],
    queryFn: async () => {
      if (!latestOportunidade?.id) return null;
      const { data, error } = await supabase
        .from("orcamentos").select("*")
        .eq("oportunidade_id", latestOportunidade.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!latestOportunidade?.id,
  });

  useEffect(() => {
    if (orcamentoOportunidade) {
      setCustoDireto(Number(orcamentoOportunidade.custo_total) || 0);
    }
  }, [orcamentoOportunidade]);

  // ── Single source of truth: all calculations derived from bdiItems + custoDireto ──
  const resultado = useMemo(() => calcAll(bdiItems, custoDireto), [bdiItems, custoDireto]);

  // ── Sync lucro líquido desejado → L component ──
  const handleLucroLiqChange = useCallback((pct: number) => {
    setLucroLiqDesejado(pct);
    // In this model, net margin % on revenue = L% (Lucro Bruto component)
    setBdiItems(prev => prev.map(item =>
      item.categoria === "lucro" ? { ...item, percentual: pct } : item
    ));
  }, []);

  // Keep lucroLiqDesejado in sync when L changes directly
  useEffect(() => {
    const lucroItem = bdiItems.find(i => i.categoria === "lucro");
    if (lucroItem && lucroLiqDesejado !== null && Math.abs(lucroItem.percentual - lucroLiqDesejado) > 0.001) {
      setLucroLiqDesejado(null);
    }
  }, [bdiItems]);

  // ── Handlers ──
  const handleChange = useCallback((index: number, value: string) => {
    setBdiItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], percentual: parseFloat(value) || 0 };
      return updated;
    });
    setLucroLiqDesejado(null);
  }, []);

  const handleSave = async () => {
    if (!bdiNome.trim()) return toast.error("Informe um nome para a configuração");
    setSaving(true);
    try {
      const componentes = bdiItems.reduce((acc, i) => {
        acc[i.sigla] = { label: i.label, percentual: i.percentual, descricao: i.descricao, categoria: i.categoria };
        return acc;
      }, {} as Record<string, any>);

      if (editId) {
        const { error } = await (supabase.from as any)("parametros_bdi")
          .update({ nome: bdiNome.trim(), componentes, bdi_calculado: resultado.bdiResultante })
          .eq("id", editId);
        if (error) throw error;
        toast.success("BDI atualizado!");
        setEditId(null);
      } else {
        const { error } = await (supabase.from as any)("parametros_bdi")
          .insert({ nome: bdiNome.trim(), componentes, bdi_calculado: resultado.bdiResultante });
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

  const handleLoad = (bdi: any) => {
    const comp = bdi.componentes as Record<string, any>;
    const loaded = defaultBDI.map(d => ({
      ...d,
      percentual: comp[d.sigla]?.percentual ?? d.percentual,
      label: comp[d.sigla]?.label ?? d.label,
      descricao: comp[d.sigla]?.descricao ?? d.descricao,
      categoria: comp[d.sigla]?.categoria ?? d.categoria,
    }));
    const existingSiglas = new Set(defaultBDI.map(d => d.sigla));
    const extras = Object.entries(comp)
      .filter(([sigla]) => !existingSiglas.has(sigla))
      .map(([sigla, val]: [string, any]) => ({
        label: val?.label || sigla, sigla,
        percentual: val?.percentual ?? 0,
        descricao: val?.descricao || "",
        categoria: (val?.categoria || "despesa") as BDIItem["categoria"],
      }));
    setBdiItems([...loaded, ...extras]);
    setBdiNome(bdi.nome);
    setEditId(bdi.id);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("parametros_bdi")
      .update({ ativo: false }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração removida");
      if (editId === id) { setEditId(null); setBdiNome(""); }
      queryClient.invalidateQueries({ queryKey: ["parametros_bdi"] });
    }
  };

  // ── Group items by category for display ──
  const groupedItems = useMemo(() => {
    const groups: { categoria: BDIItem["categoria"]; items: { item: BDIItem; globalIndex: number }[] }[] = [];
    for (const cat of CATEGORIAS_ORDER) {
      const catItems = bdiItems
        .map((item, idx) => ({ item, globalIndex: idx }))
        .filter(({ item }) => item.categoria === cat);
      if (catItems.length > 0) groups.push({ categoria: cat, items: catItems });
    }
    return groups;
  }, [bdiItems]);

  // ── DRE rows ──
  type DreRow = { label: string; value: number; level: number; highlight?: boolean; accent?: boolean; pct?: number; editable?: { index: number } };

  const dreRows: DreRow[] = useMemo(() => {
    const rows: DreRow[] = [
      { label: "Receita Bruta (Preço de Venda)", value: resultado.receitaBruta, level: 0, highlight: true },
    ];

    if (resultado.tributosValorDetail.length > 0) {
      rows.push({ label: "(-) Tributos sobre Receita", value: -resultado.tributosTotal, level: 1, pct: resultado.tributosPct });
      resultado.tributosValorDetail.forEach(t => {
        if (t.percentual > 0) rows.push({ label: `    ${t.label} (${t.sigla})`, value: -t.valor, level: 2, pct: t.percentual });
      });
    }

    rows.push({ label: "(=) Receita Líquida", value: resultado.receitaLiquida, level: 0, highlight: true });
    rows.push({ label: "(-) Custos Diretos", value: -resultado.custoDireto, level: 1 });
    rows.push({ label: "(=) Lucro Bruto", value: resultado.lucroBruto, level: 0, highlight: true, pct: resultado.margemBruta });

    rows.push({ label: "(-) Despesas Operacionais", value: -resultado.totalDespesasValor, level: 1, pct: resultado.totalDespesasSobreCDPct });
    resultado.despesasDetail.forEach(d => {
      if (d.percentual > 0) rows.push({ label: `    ${d.label}`, value: -d.valor, level: 2, pct: d.percentual });
    });
    if (resultado.riscoPct > 0) rows.push({ label: "    Risco", value: -resultado.riscoValor, level: 2, pct: resultado.riscoPct });
    if (resultado.comissaoPct > 0) rows.push({ label: "    Comissões", value: -resultado.comissaoValor, level: 2, pct: resultado.comissaoPct });

    rows.push({ label: "(=) Lucro antes do IR (EBIT)", value: resultado.lucroAntesIR, level: 0, highlight: true, pct: resultado.margemEbit });

    rows.push({ label: "(-) Impostos sobre Lucro", value: -resultado.irTotal, level: 1, pct: resultado.irPct });
    resultado.irDetail.forEach(i => {
      if (i.percentual > 0) rows.push({ label: `    ${i.label}`, value: -i.valor, level: 2, pct: i.percentual });
    });

    rows.push({ label: "(=) Lucro Líquido", value: resultado.lucroLiquido, level: 0, accent: true, pct: resultado.margemLiquida });

    return rows;
  }, [resultado]);

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">BDI & Formação de Preço</h1>
          <p className="page-subtitle">
            Altere qualquer valor — BDI e DRE se atualizam instantaneamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          {latestOportunidade && (
            <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Oport.:</span>
              <span className="font-semibold">{latestOportunidade.codigo}</span>
              {orcamentoOportunidade && (
                <Badge variant="outline" className="text-[10px]">
                  CD: {fmt(Number(orcamentoOportunidade.custo_total))}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard label="Custo Direto" value={fmt(custoDireto)} sub="" />
        <KpiCard label="BDI" value={fmtPct(resultado.bdiResultante)} variant="accent" sub={`Fator: ${(1 + resultado.bdiResultante / 100).toFixed(4)}`} />
        <KpiCard label="Preço de Venda" value={fmt(resultado.receitaBruta)} variant="primary" sub="" />
        <KpiCard label="Margem de Contribuição" value={fmt(resultado.lucroBruto)} sub={fmtPct(resultado.margemBruta)} />
        <KpiCard
          label="Lucro Líquido"
          value={fmt(resultado.lucroLiquido)}
          sub={fmtPct(resultado.margemLiquida)}
          variant={resultado.lucroLiquido >= 0 ? "success" : "danger"}
        />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ══ LEFT: BDI Editor ══ */}
        <div className="space-y-4">
          {/* Saved configs */}
          {(savedBdis || []).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Configurações Salvas
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
                      <div className="flex-1" onClick={() => handleLoad(bdi)}>
                        <p className="text-xs font-medium">{bdi.nome}</p>
                        <p className="text-[10px] text-muted-foreground">BDI: {Number(bdi.bdi_calculado).toFixed(2)}%</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(bdi.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custo Direto input */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap font-semibold">Custo Direto (R$)</Label>
                <Input
                  type="number"
                  value={custoDireto}
                  onChange={e => setCustoDireto(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-mono flex-1"
                />
                {orcamentoOportunidade && (
                  <Button
                    variant="ghost" size="sm" className="gap-1 text-[10px] h-7 shrink-0"
                    onClick={() => setCustoDireto(Number(orcamentoOportunidade.custo_total) || 0)}
                  >
                    <RefreshCw className="w-3 h-3" /> Sincronizar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
                <Label className="text-xs whitespace-nowrap font-semibold text-accent">Lucro Bruto desejado (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5.00"
                  value={lucroLiqDesejado ?? ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) handleLucroLiqChange(v);
                    else setLucroLiqDesejado(null);
                  }}
                  className="h-8 text-xs font-mono flex-1 border-accent/30"
                />
                <span className="text-xs text-muted-foreground">%</span>
                {lucroLiqDesejado !== null && (
                  <Badge variant="outline" className="text-[10px] border-accent/30 text-accent shrink-0">
                    Preço: {fmt(resultado.receitaBruta)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BDI items grouped by category */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold">Componentes do BDI</h2>
              </div>
              <div className="bg-accent/10 text-accent px-3 py-1 rounded-full">
                <span className="text-sm font-bold">{resultado.bdiResultante.toFixed(2)}%</span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {groupedItems.map(group => (
                <div key={group.categoria}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {CATEGORIA_LABELS[group.categoria] || group.categoria}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(({ item, globalIndex }) => {
                      const isLucro = item.categoria === "lucro";
                      const valorCalculado = item.categoria === "tributo" || item.categoria === "ir"
                        ? resultado.receitaBruta * (item.percentual / 100)
                        : custoDireto * (item.percentual / 100);

                      return (
                        <div key={item.sigla} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isLucro ? "bg-primary/10 border border-primary/20" : "bg-muted/40 hover:bg-muted/70"}`}>
                          <span className="text-[10px] font-bold text-accent uppercase w-12 text-center shrink-0">{item.sigla}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.label}</p>
                            {isLucro && (
                              <p className="text-[10px] text-muted-foreground">Calculado via &quot;Lucro Bruto desejado&quot;</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isLucro ? (
                              <span className="w-20 px-2 py-1.5 text-xs text-right bg-muted border rounded-md font-mono text-muted-foreground">
                                {resultado.margemBruta.toFixed(2)}
                              </span>
                            ) : (
                              <input
                                type="number" step="0.01"
                                value={item.percentual}
                                onChange={e => handleChange(globalIndex, e.target.value)}
                                className="w-20 px-2 py-1.5 text-xs text-right bg-background border rounded-md focus:ring-2 focus:ring-ring outline-none font-mono"
                              />
                            )}
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          {/* Show calculated value */}
                          <span className={`text-[10px] font-mono w-24 text-right shrink-0 ${isLucro ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            {isLucro ? fmt(resultado.lucroBruto) : fmt(valorCalculado)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Save */}
            <div className="p-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nome da configuração"
                  value={bdiNome}
                  onChange={e => setBdiNome(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button size="sm" className="gap-1.5 shrink-0" onClick={handleSave} disabled={saving}>
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

          {/* Formula */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground">Fórmula de Preço (inversa)</h3>
              </div>
              <div className="bg-muted rounded-md p-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
                Preço = (CD + Despesas) / (1 - Tributos% - IR% - Lucro%)
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                BDI efetivo: <span className="font-mono font-medium">{fmtPct(resultado.bdiResultante)}</span>
                {" · "}Preço = <span className="font-mono font-medium">{fmt(resultado.receitaBruta)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══ RIGHT: DRE ══ */}
        <div className="space-y-4">
          {/* DRE table */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold">DRE — Formação de Preço</h2>
              <ArrowRight className="w-4 h-4 text-muted-foreground mx-1" />
              <Badge variant="secondary" className="text-[10px] gap-1">
                <RefreshCw className="w-3 h-3" /> Tempo real
              </Badge>
            </div>
            <div className="p-4">
              {dreRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${
                    row.highlight ? "bg-muted font-semibold" : row.accent ? "bg-primary/10 font-bold border border-primary/30" : "hover:bg-muted/30"
                  }`}
                  style={{ paddingLeft: `${row.level * 16 + 12}px` }}
                >
                  <span className={`text-xs ${row.level === 2 ? "text-muted-foreground" : ""}`}>{row.label}</span>
                  <div className="flex items-center gap-3">
                    {row.pct !== undefined && (
                      <span className="text-[10px] text-muted-foreground w-14 text-right">{fmtPct(row.pct)}</span>
                    )}
                    <span className={`text-xs font-mono w-28 text-right ${row.value < 0 ? "text-destructive" : ""} ${row.accent ? "text-primary text-sm" : ""}`}>
                      {row.value < 0 ? "- " : ""}{fmt(Math.abs(row.value))}
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
                  <p className="font-mono font-semibold">{fmtPct(resultado.cargaTributaria)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Composition breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Composição do Preço de Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <PriceBar label="Custo Direto" value={custoDireto} total={resultado.receitaBruta} color="bg-blue-500" />
                <PriceBar label="Despesas Operacionais" value={resultado.totalDespesasValor} total={resultado.receitaBruta} color="bg-amber-500" />
                <PriceBar label="Tributos" value={resultado.tributosTotal} total={resultado.receitaBruta} color="bg-red-500" />
                <PriceBar label="IR/CSLL" value={resultado.irTotal} total={resultado.receitaBruta} color="bg-orange-500" />
                <PriceBar label="Lucro Líquido" value={resultado.lucroLiquido} total={resultado.receitaBruta} color="bg-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function KpiCard({ label, value, sub, variant }: { label: string; value: string; sub: string; variant?: string }) {
  const bg = variant === "primary" ? "bg-primary/10 border-primary/30"
    : variant === "accent" ? "bg-accent/10 border-accent/30"
    : variant === "success" ? "bg-emerald-500/10 border-emerald-500/30"
    : variant === "danger" ? "bg-destructive/10 border-destructive/30"
    : "bg-muted/50 border-border";
  const textColor = variant === "primary" ? "text-primary"
    : variant === "accent" ? "text-accent"
    : variant === "success" ? "text-emerald-600"
    : variant === "danger" ? "text-destructive"
    : "";

  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold font-mono ${textColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PriceBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (Math.max(0, value) / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-32 shrink-0 text-right text-muted-foreground">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

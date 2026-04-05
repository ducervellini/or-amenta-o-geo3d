import { useState, useMemo, useEffect } from "react";
import {
  Calculator, Save, Info, Trash2, Edit, DollarSign, ArrowUp,
  TrendingUp, Link2, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

function calcBdi(items: BDIItem[]) {
  const ac = items.find((i) => i.sigla === "AC")?.percentual || 0;
  const sg = items.find((i) => i.sigla === "S+G")?.percentual || 0;
  const r = items.find((i) => i.sigla === "R")?.percentual || 0;
  const df = items.find((i) => i.sigla === "DF")?.percentual || 0;
  const com = items.find((i) => i.sigla === "COM")?.percentual || 0;
  const l = items.find((i) => i.sigla === "L")?.percentual || 0;
  const tributos = items
    .filter((i) => ["PIS", "COFINS", "ISS", "CPRB"].includes(i.sigla))
    .reduce((sum, i) => sum + i.percentual, 0);
  const bdiCalc =
    ((1 + (ac + sg + r) / 100) * (1 + df / 100) * (1 + com / 100) * (1 + l / 100)) /
      (1 - tributos / 100) -
    1;
  return { bdiCalc, bdiPercent: bdiCalc * 100, ac, sg, r, df, com, l, tributos };
}

// ── DRE types ──

interface BDIComp {
  sigla: string;
  label: string;
  percentual: number;
  descricao: string;
}

// ══════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════

export default function BdiDre() {
  const queryClient = useQueryClient();

  // ── Shared state ──
  const [selectedBdiId, setSelectedBdiId] = useState<string>("");

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

  // Auto-select latest oportunidade
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

  // Auto-load cost from latest oportunidade's orcamento
  useEffect(() => {
    if (orcamentoOportunidade) {
      setCustoDireto(Number(orcamentoOportunidade.custo_total) || 0);
      if (orcamentoOportunidade.bdi_id) {
        setSelectedBdiId(orcamentoOportunidade.bdi_id);
      }
    }
  }, [orcamentoOportunidade]);

  // Auto-select first BDI if nothing selected
  useEffect(() => {
    if (!selectedBdiId && savedBdis?.length) {
      setSelectedBdiId(savedBdis[0].id);
    }
  }, [savedBdis, selectedBdiId]);

  // ── BDI calculations ──
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
    setSelectedBdiId(bdi.id);
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

  // ── DRE calculations ──

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

  const categorias = useMemo(() => {
    const TRIBUTOS_SIGLAS = ["PIS", "COFINS", "ISS", "CPRB", "ICMS"];
    const tributos: BDIComp[] = [];
    const despesas: BDIComp[] = [];
    let lucroComp: BDIComp | null = null;
    let riscoComp: BDIComp | null = null;
    let comissaoComp: BDIComp | null = null;

    for (const c of bdiComponentes) {
      const s = c.sigla.toUpperCase();
      const lab = c.label.toUpperCase();
      if (s === "L" || lab.includes("LUCRO")) lucroComp = c;
      else if (s === "R" || lab.includes("RISCO")) riscoComp = c;
      else if (s === "COM" || lab.includes("COMISS")) comissaoComp = c;
      else if (TRIBUTOS_SIGLAS.includes(s) || lab.includes("TRIBUT") || lab.includes("IMPOSTO")) tributos.push(c);
      else despesas.push(c);
    }
    return { tributos, despesas, lucroComp, riscoComp, comissaoComp };
  }, [bdiComponentes]);

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
      irpjValor, csllValor, totalIR, totalIRPct: totalIRPct,
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">BDI & Formação de Preço</h1>
          <p className="page-subtitle">
            Configure o BDI e simule a DRE para formação de preço de venda
          </p>
        </div>
        {/* Oportunidade badge */}
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

      <Tabs defaultValue="bdi" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bdi" className="gap-2">
            <Calculator className="w-4 h-4" />
            BDI
          </TabsTrigger>
          <TabsTrigger value="dre" className="gap-2">
            <DollarSign className="w-4 h-4" />
            DRE
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════ TAB: BDI ══════════════════════ */}
        <TabsContent value="bdi">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-5 border-b flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-semibold">Componentes do BDI</h2>
                </div>
                <div className="p-5 space-y-3">
                  {bdiItems.map((item, idx) => (
                    <div key={item.sigla} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="w-16 text-center">
                        <span className="text-xs font-bold text-accent uppercase">{item.sigla}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.descricao}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.percentual}
                          onChange={(e) => handleBdiChange(idx, e.target.value)}
                          className="w-24 px-3 py-2 text-sm text-right bg-background border rounded-md focus:ring-2 focus:ring-ring outline-none"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t flex items-center gap-3">
                  <Input
                    placeholder="Nome da configuração (ex: BDI Padrão)"
                    value={bdiNome}
                    onChange={(e) => setBdiNome(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button className="gap-2" onClick={handleBdiSave} disabled={saving}>
                    <Save className="w-4 h-4" />
                    {editId ? "Atualizar" : "Salvar"}
                  </Button>
                  {editId && (
                    <Button variant="ghost" onClick={() => { setEditId(null); setBdiNome(""); setBdiItems(defaultBDI); }}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {(savedBdis || []).length > 0 && (
                <div className="bg-card rounded-lg border shadow-sm">
                  <div className="p-5 border-b">
                    <h2 className="text-lg font-semibold">Configurações Salvas</h2>
                  </div>
                  <div className="divide-y">
                    {(savedBdis || []).map((bdi: any) => (
                      <div key={bdi.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex-1 cursor-pointer" onClick={() => handleBdiLoad(bdi)}>
                          <p className="font-medium text-sm">{bdi.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            BDI: {Number(bdi.bdi_calculado).toFixed(2)}% — {new Date(bdi.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleBdiLoad(bdi)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleBdiDelete(bdi.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-card rounded-lg border shadow-sm p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">BDI Calculado</p>
                <p className="text-4xl font-bold text-accent">{bdiPercent.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-3">Fator multiplicador: {(1 + bdiCalc).toFixed(4)}</p>
              </div>

              <div className="bg-card rounded-lg border shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-info" />
                  <h3 className="text-sm font-semibold">Fórmula</h3>
                </div>
                <div className="bg-muted rounded-md p-3 text-xs font-mono text-muted-foreground leading-relaxed">
                  BDI = [(1+AC+S+R+G) × (1+DF) × (1+COM) × (1+L)] / (1-I) - 1
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>AC = Administração Central</p>
                  <p>S+G = Seguros e Garantias</p>
                  <p>R = Risco</p>
                  <p>DF = Despesas Financeiras</p>
                  <p>COM = Comissões</p>
                  <p>L = Lucro</p>
                  <p>I = Impostos (PIS+COFINS+ISS+CPRB)</p>
                </div>
              </div>

              <div className="bg-card rounded-lg border shadow-sm p-5">
                <h3 className="text-sm font-semibold mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Custos Indiretos</span><span className="font-medium">{(ac + sg + r).toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Desp. Financeiras</span><span className="font-medium">{df.toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Comissões</span><span className="font-medium">{com.toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lucro</span><span className="font-medium">{l.toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tributos</span><span className="font-medium">{tributos.toFixed(2)}%</span></div>
                  <div className="flex justify-between pt-2 border-t font-semibold"><span>BDI Total</span><span className="text-accent">{bdiPercent.toFixed(2)}%</span></div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════ TAB: DRE ══════════════════════ */}
        <TabsContent value="dre">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              {/* BDI selecionado */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Configuração BDI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedBdiId} onValueChange={setSelectedBdiId}>
                    <SelectTrigger>
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
                  {selectedBdi && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      <div className="text-xs font-medium">{selectedBdi.nome}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {bdiComponentes.map(c => (
                          <Badge key={c.sigla} variant="outline" className="text-[10px]">
                            {c.sigla} {c.percentual.toFixed(2)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Oportunidade info */}
              {latestOportunidade && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Oportunidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      <div className="text-xs font-medium">{latestOportunidade.codigo} — {latestOportunidade.descricao}</div>
                      <div className="text-xs text-muted-foreground">
                        Cliente: {(latestOportunidade as any).clientes?.nome || "—"}
                      </div>
                      {orcamentoOportunidade && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Custo Total: {fmt(Number(orcamentoOportunidade.custo_total))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Parâmetros */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Parâmetros</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Custo Direto Total (R$)</Label>
                    <Input type="number" value={custoDireto} onChange={e => setCustoDireto(parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-semibold text-primary">Lucro Líquido Desejado (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="number" step="0.01" value={lucroLiquidoPct} onChange={e => setLucroLiquidoPct(parseFloat(e.target.value) || 0)} className="border-primary/50" />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">% sobre a receita bruta</p>
                  </div>
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground">Impostos sobre Lucro</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">IRPJ (%)</Label>
                      <Input type="number" step="0.01" value={irpjPct} onChange={e => setIrpjPct(parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">CSLL (%)</Label>
                      <Input type="number" step="0.01" value={csllPct} onChange={e => setCsllPct(parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Indicadores */}
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">BDI Resultante</p>
                  <p className="text-3xl font-bold text-primary font-mono">{fmtPct(resultado.bdiPct)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmt(resultado.bdiValor)} sobre {fmt(custoDireto)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Indicadores</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Margem Bruta</span><span className="font-medium font-mono">{fmtPct(resultado.margemBruta)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Margem EBIT</span><span className="font-medium font-mono">{fmtPct(resultado.margemEbit)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Margem Líquida</span><span className="font-medium font-mono text-primary">{fmtPct(resultado.margemLiquida)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Custo / Receita</span><span className="font-medium font-mono">{resultado.receitaBruta > 0 ? fmtPct((custoDireto / resultado.receitaBruta) * 100) : "0%"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Carga Tributária</span><span className="font-medium font-mono">{fmtPct(resultado.totalTributosPct + resultado.totalIRPct)}</span></div>
                </CardContent>
              </Card>
            </div>

            {/* DRE table */}
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
                        row.highlight ? "bg-muted font-semibold" : row.accent ? "bg-primary/10 font-bold border border-primary/30" : ""
                      }`}
                      style={{ paddingLeft: `${row.level * 24 + 12}px` }}
                    >
                      <span className={`text-sm ${row.level === 2 ? "text-muted-foreground" : ""}`}>{row.label}</span>
                      <div className="flex items-center gap-3">
                        {row.pct !== undefined && (
                          <span className="text-xs text-muted-foreground w-14 text-right">{fmtPct(row.pct)}</span>
                        )}
                        <span className={`text-sm font-mono w-32 text-right ${row.value < 0 ? "text-destructive" : ""} ${row.accent ? "text-primary text-base" : ""}`}>
                          {row.value < 0 ? "-" : ""}{fmt(Math.abs(row.value))}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

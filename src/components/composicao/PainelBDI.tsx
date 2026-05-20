import { useState, useEffect, useMemo } from "react";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemoriaCalculo } from "./MemoriaCalculo";
import {
  calcularBDI, calcularDRE, getDefaultParametrosBDI,
  type ParametrosBDI, type ResultadoBDI, type ResultadoDRE,
} from "@/lib/bdi-calculo";
import { calcularBDITCU2622, percentualEfetivoTributo, type ParametrosTCU2622 } from "@/lib/calculos-v2";
import type { BdiMetodologia, RegimeTributario, CodigoTCU } from "@/types/calculo-v2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Landmark, TrendingUp, Receipt, DollarSign } from "lucide-react";

interface Props {
  custoDireto: number;
  onBdiCalculado?: (resultado: ResultadoBDI) => void;
  /** Fase 1 BDI/CCU: metodologia selecionada (default simplificado mantém comportamento atual) */
  bdiMetodologia?: BdiMetodologia;
  /** Regime tributário da oportunidade (zera tributos REIDI/Simples/MEI) */
  regimeTributario?: RegimeTributario;
  /** Códigos TCU por tributo (sigla → AC/S/G/R/DF/L/IT_*) — usado quando bdiMetodologia === 'tcu_2622' */
  codigosTcu?: Record<string, CodigoTCU>;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function PainelBDI({ custoDireto, onBdiCalculado, bdiMetodologia = "simplificado", regimeTributario = "padrao", codigosTcu = {} }: Props) {
  const { data: paramAdminLocal } = useSupabaseQuery("parametros_admin_local");
  const { data: paramAdminCentral } = useSupabaseQuery("parametros_admin_central");
  const { data: paramFinanciamento } = useSupabaseQuery("parametros_financiamento");
  const { data: paramTributos } = useSupabaseQuery("parametros_tributos");
  const { data: paramMargem } = useSupabaseQuery("parametros_margem");

  const [params, setParams] = useState<ParametrosBDI>(getDefaultParametrosBDI());

  // Load from database parameters
  useEffect(() => {
    const al = paramAdminLocal?.filter((p) => p.ativo);
    const ac = paramAdminCentral?.filter((p) => p.ativo);
    const fin = paramFinanciamento?.filter((p) => p.ativo);
    const trib = paramTributos?.filter((p) => p.ativo);
    const marg = paramMargem?.filter((p) => p.ativo);

    setParams((prev) => ({
      ...prev,
      admin_local_percentual: al?.reduce((s, p) => s + Number(p.percentual), 0) ?? prev.admin_local_percentual,
      admin_central_percentual: ac?.reduce((s, p) => s + Number(p.percentual), 0) ?? prev.admin_central_percentual,
      financiamento_percentual: fin?.[0] ? Number(fin[0].percentual) : prev.financiamento_percentual,
      tributos: trib?.map((t) => ({ nome: String(t.nome), sigla: String(t.sigla), percentual: Number(t.percentual) })) ?? prev.tributos,
      margem_percentual: marg?.[0] ? Number(marg[0].percentual_padrao) : prev.margem_percentual,
    }));
  }, [paramAdminLocal, paramAdminCentral, paramFinanciamento, paramTributos, paramMargem]);

  const resultadoBDI = useMemo(() => {
    const r = calcularBDI(custoDireto, params);
    onBdiCalculado?.(r);
    return r;
  }, [custoDireto, params]);

  const resultadoDRE = useMemo(() => {
    return calcularDRE(resultadoBDI.preco_final_bdi, custoDireto, params);
  }, [resultadoBDI.preco_final_bdi, custoDireto, params]);

  const set = (k: keyof ParametrosBDI, v: unknown) => setParams((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-lg border p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building className="w-3.5 h-3.5" />Admin Local
          </div>
          <div className="font-mono font-semibold text-sm">R$ {fmt(resultadoBDI.admin_local)}</div>
        </div>
        <div className="bg-card rounded-lg border p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Landmark className="w-3.5 h-3.5" />Admin Central
          </div>
          <div className="font-mono font-semibold text-sm">R$ {fmt(resultadoBDI.admin_central)}</div>
        </div>
        <div className="bg-card rounded-lg border p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Receipt className="w-3.5 h-3.5" />Tributos
          </div>
          <div className="font-mono font-semibold text-sm">R$ {fmt(resultadoBDI.tributos_total)}</div>
        </div>
        <div className="bg-card rounded-lg border p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" />Margem
          </div>
          <div className="font-mono font-semibold text-sm">R$ {fmt(resultadoBDI.margem)}</div>
        </div>
      </div>

      {/* BDI highlight */}
      <div className="bg-primary/10 rounded-lg border border-primary/30 p-4 text-center space-y-1">
        <div className="text-xs text-muted-foreground">BDI</div>
        <div className="text-2xl font-mono font-bold text-primary">{resultadoBDI.bdi_percentual.toFixed(2)}%</div>
        <div className="text-xs text-muted-foreground">Preço Final</div>
        <div className="text-xl font-mono font-bold">R$ {fmt(resultadoBDI.preco_final_bdi)}</div>
      </div>

      {/* Editable params + Memory */}
      <Tabs defaultValue="params" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="params" className="text-xs">Parâmetros</TabsTrigger>
          <TabsTrigger value="bdi" className="text-xs">BDI</TabsTrigger>
          <TabsTrigger value="dre" className="text-xs">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="space-y-3 pt-2">
          <div className="space-y-2">
            <NumField label="Admin. Local (%)" value={params.admin_local_percentual} onChange={(v) => set("admin_local_percentual", v)} />
            <NumField label="Admin. Central (%)" value={params.admin_central_percentual} onChange={(v) => set("admin_central_percentual", v)} />
            <NumField label="Financiamento (%)" value={params.financiamento_percentual} onChange={(v) => set("financiamento_percentual", v)} />
            <div className="text-xs font-semibold text-muted-foreground uppercase mt-2">Tributos</div>
            {params.tributos.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs w-16 shrink-0">{t.sigla}</span>
                <Input
                  type="number" step="0.01" className="h-7 text-xs"
                  value={t.percentual}
                  onChange={(e) => {
                    const newTrib = [...params.tributos];
                    newTrib[i] = { ...t, percentual: parseFloat(e.target.value) || 0 };
                    set("tributos", newTrib);
                  }}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ))}
            <NumField label="Margem de Lucro (%)" value={params.margem_percentual} onChange={(v) => set("margem_percentual", v)} />
          </div>
        </TabsContent>

        <TabsContent value="bdi" className="pt-2">
          <MemoriaCalculo memoria={resultadoBDI.memoria} titulo="Memória BDI" />
        </TabsContent>

        <TabsContent value="dre" className="pt-2">
          <MemoriaCalculo memoria={resultadoDRE.memoria} titulo="DRE Projetado" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs flex-1">{label}</Label>
      <Input type="number" step="0.01" className="h-7 text-xs w-24" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  );
}

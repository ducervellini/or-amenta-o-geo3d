import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoriaCalculo } from "./MemoriaCalculo";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";
import {
  calcularMaoDeObra, calcularEquipamento, calcularMaterial,
  getDefaultParamsMaoDeObra, getDefaultParamsEquipamento, getDefaultParamsMaterial,
  type ParametrosMaoDeObra, type ParametrosEquipamento, type ParametrosMaterial,
  type ResultadoCalculo,
} from "@/lib/composicao-calculo";

type TipoInsumo = "mao_de_obra" | "equipamento" | "material";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoInicial?: TipoInsumo;
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  loading?: boolean;
}

const tipoLabels: Record<TipoInsumo, string> = {
  mao_de_obra: "Mão de Obra",
  equipamento: "Equipamento",
  material: "Material",
};

const UNIDADES = [
  "amostras", "bandeiras", "base", "caderno de preços", "cadastros", "contrato",
  "dia", "diligência", "h", "ha", "imóveis", "km", "km²", "laudos", "m", "m²",
  "marcos", "modelo", "mês", "ofertas", "piquetes", "plantas", "pontos",
  "propriedades", "protocolo", "pt", "relatórios", "seções", "torres",
  "travessias", "un", "unidades", "vértices",
];

export function ComposicaoItemForm({ open, onOpenChange, tipoInicial = "mao_de_obra", initialValues, onSubmit, loading }: Props) {
  const [tipo, setTipo] = useState<TipoInsumo>(tipoInicial);
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1); // units produced in the period
  const [unidade, setUnidade] = useState("un");
  const [periodo, setPeriodo] = useState<"hora" | "dia" | "mês">("dia");
  const [observacoes, setObservacoes] = useState("");
  const [insumoId, setInsumoId] = useState("");

  // Type-specific params
  const [paramsMO, setParamsMO] = useState<ParametrosMaoDeObra>(getDefaultParamsMaoDeObra());
  const [paramsEq, setParamsEq] = useState<ParametrosEquipamento>(getDefaultParamsEquipamento());
  const [paramsMa, setParamsMa] = useState<ParametrosMaterial>(getDefaultParamsMaterial());

  // Cadastro data
  const { data: cargos } = useSupabaseQuery("cargos");
  const { data: encargos } = useSupabaseQuery("encargos_sociais");
  const { data: beneficios } = useSupabaseQuery("beneficios");
  const { data: jornadas } = useSupabaseQuery("jornadas_trabalho");
  const { data: regimes } = useSupabaseQuery("regimes_operacionais");
  const { data: horarios } = useSupabaseQuery("horarios_almoco");
  const { data: equipamentos } = useSupabaseQuery("equipamentos");
  const { data: materiais } = useSupabaseQuery("materiais");
  const { data: combustiveis } = useSupabaseQuery("combustiveis");

  useEffect(() => {
    if (initialValues) {
      setTipo((initialValues.tipo_insumo as TipoInsumo) || "mao_de_obra");
      setDescricao((initialValues.descricao as string) || "");
      setQuantidade(Number(initialValues.quantidade) || 1);
      setUnidade((initialValues.unidade as string) || "un");
      setPeriodo(((initialValues as any).periodo || (initialValues as any).prazo || "dia") as "hora" | "dia" | "mês");
      setObservacoes((initialValues.observacoes as string) || "");
      setInsumoId((initialValues.insumo_id as string) || "");
      const p = (initialValues.parametros as Record<string, unknown>) || {};
      if (initialValues.tipo_insumo === "mao_de_obra") setParamsMO({ ...getDefaultParamsMaoDeObra(), ...p } as ParametrosMaoDeObra);
      if (initialValues.tipo_insumo === "equipamento") setParamsEq({ ...getDefaultParamsEquipamento(), ...p } as ParametrosEquipamento);
      if (initialValues.tipo_insumo === "material") setParamsMa({ ...getDefaultParamsMaterial(), ...p } as ParametrosMaterial);
    }
  }, [initialValues]);

  // Auto-populate from cadastros
  const handleSelectInsumo = (id: string) => {
    setInsumoId(id);
    if (tipo === "mao_de_obra") {
      const cargo = cargos?.find((c) => c.id === id);
      if (cargo) {
        setDescricao(String(cargo.nome));
        const regimeContratacao = String((cargo as any).regime_contratacao || "clt");
        const isPJ = regimeContratacao === "pj";

        const cargoEncargosIds = Array.isArray((cargo as any).encargos_selecionados)
          ? ((cargo as any).encargos_selecionados as string[])
          : [];
        const totalEncargos = isPJ ? 0 : (encargos || [])
          .filter((e) => cargoEncargosIds.includes(String(e.id)))
          .reduce((s, e) => s + Number(e.percentual), 0);

        const cargoBeneficiosIds = Array.isArray((cargo as any).beneficios_selecionados)
          ? ((cargo as any).beneficios_selecionados as string[])
          : [];
        const totalBeneficios = isPJ ? 0 : (beneficios || [])
          .filter((b) => cargoBeneficiosIds.includes(String(b.id)))
          .reduce((s, b) => {
            if (String(b.tipo) === "percentual") {
              return s + Number(cargo.salario_base) * (Number(b.valor) / 100);
            }
            return s + Number(b.valor);
          }, 0);

        const jornada = (cargo as any).jornada_id
          ? jornadas?.find((j) => j.id === (cargo as any).jornada_id)
          : null;

        const regime = (cargo as any).regime_id
          ? regimes?.find((r) => r.id === (cargo as any).regime_id)
          : null;

        const horario = (cargo as any).horario_almoco_id
          ? horarios?.find((h) => h.id === (cargo as any).horario_almoco_id)
          : null;

        setParamsMO({
          salario_base: Number(cargo.salario_base),
          regime_contratacao: regimeContratacao as "clt" | "pj",
          encargos_percentual: totalEncargos,
          beneficios_valor: totalBeneficios,
          horas_mes: jornada ? Number(jornada.horas_por_mes) : 176,
          horas_diarias: jornada ? Number(jornada.horas_diarias) : 8,
          dias_mes: jornada ? Number(jornada.dias_por_semana) * 4.33 : 22,
          regime_dias_trabalho: regime ? Number(regime.dias_trabalho) : 0,
          regime_dias_folga: regime ? Number(regime.dias_folga) : 0,
          almoco_minutos: horario ? Number(horario.duracao_minutos) : 60,
        });
      }
    } else if (tipo === "equipamento") {
      const eq = equipamentos?.find((e) => e.id === id);
      if (eq) {
        setDescricao(String(eq.nome));
        setUnidade(String(eq.unidade));
        const comb = combustiveis?.find((c) => c.ativo);
        setParamsEq((prev) => ({
          ...prev,
          depreciacao_hora: Number(eq.depreciacao_hora),
          manutencao_hora: Number(eq.custo_hora_improdutiva),
          combustivel_preco_litro: comb ? Number(comb.preco_litro) : 0,
        }));
      }
    } else if (tipo === "material") {
      const ma = materiais?.find((m) => m.id === id);
      if (ma) {
        setDescricao(String(ma.nome));
        setUnidade(String(ma.unidade));
        setParamsMa((prev) => ({
          ...prev,
          custo_unitario: Number(ma.preco_unitario),
        }));
      }
    }
  };

  // Convert periodo to hours for MO calculation (always 1 period)
  const periodoEmHoras = useMemo(() => {
    if (periodo === "hora") return 1;
    if (periodo === "dia") return paramsMO.horas_diarias;
    // mês
    return paramsMO.horas_mes;
  }, [periodo, paramsMO.horas_diarias, paramsMO.horas_mes]);

  // Auto-calculate coeficiente based on productivity
  // If worker produces `quantidade` units in 1 period,
  // then hours per unit = periodoEmHoras / quantidade
  const coeficienteCalculado = useMemo(() => {
    if (tipo !== "mao_de_obra") return 1;
    if (quantidade <= 0) return 0;
    return periodoEmHoras / quantidade;
  }, [tipo, periodoEmHoras, quantidade]);

  const resultado: ResultadoCalculo = useMemo(() => {
    try {
      if (tipo === "mao_de_obra") return calcularMaoDeObra(paramsMO, 1, coeficienteCalculado);
      if (tipo === "equipamento") return calcularEquipamento(paramsEq, quantidade, 1);
      return calcularMaterial(paramsMa, quantidade, 1);
    } catch {
      return { custo_unitario: 0, custo_total: 0, memoria: [] };
    }
  }, [tipo, paramsMO, paramsEq, paramsMa, quantidade, coeficienteCalculado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = tipo === "mao_de_obra" ? paramsMO : tipo === "equipamento" ? paramsEq : paramsMa;
    onSubmit({
      tipo_insumo: tipo,
      insumo_id: insumoId || crypto.randomUUID(),
      descricao,
      quantidade,
      coeficiente: tipo === "mao_de_obra" ? coeficienteCalculado : 1,
      unidade,
      periodo,
      observacoes,
      custo_unitario: resultado.custo_unitario,
      custo_total: resultado.custo_total,
      parametros: params,
      grupo_custo: "direto",
    });
  };

  const insumoOptions = useMemo(() => {
    if (tipo === "mao_de_obra") return (cargos || []).map((c) => ({ id: String(c.id), nome: String(c.nome) }));
    if (tipo === "equipamento") return (equipamentos || []).map((e) => ({ id: String(e.id), nome: String(e.nome) }));
    return (materiais || []).map((m) => ({ id: String(m.id), nome: String(m.nome) }));
  }, [tipo, cargos, equipamentos, materiais]);

  const fmtBR = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Editar Item" : "Novo Item"} — {tipoLabels[tipo]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Tipo de Insumo + 2. Selecionar do Cadastro */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de Insumo</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v as TipoInsumo); setInsumoId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Selecionar do Cadastro</Label>
              <Select value={insumoId} onValueChange={handleSelectInsumo}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {insumoOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Quantidade + 4. Unidade + 5. Prazo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input type="number" step="0.0001" value={quantidade} onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as "hora" | "dia" | "mês")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hora">Hora</SelectItem>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="mês">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* MO productivity summary */}
          {tipo === "mao_de_obra" && insumoId && (
            <div className="bg-muted/50 rounded-lg p-3 border space-y-1 text-sm">
              <div className="font-semibold text-xs uppercase text-muted-foreground">Cálculo de Produtividade</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-muted-foreground">H/H (custo hora):</span>
                <span className="font-mono font-medium">R$ {fmtBR(resultado.memoria.find(m => m.descricao.includes("Custo hora c/ regime"))?.valor || 0)}</span>
                <span className="text-muted-foreground">Período ({periodo}):</span>
                <span className="font-mono">{fmtBR(periodoEmHoras)} h</span>
                <span className="text-muted-foreground">Horas por unidade:</span>
                <span className="font-mono">{fmtBR(coeficienteCalculado)} h/{unidade}</span>
                <span className="text-muted-foreground font-semibold">Custo unitário (1 {unidade}):</span>
                <span className="font-mono font-semibold text-primary">R$ {fmtBR(resultado.custo_unitario)}</span>
              </div>
            </div>
          )}

          {/* Parâmetros por tipo - only show for non-MO or in detail tab */}
          <Tabs defaultValue={tipo === "mao_de_obra" ? "memoria" : "params"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="params">Parâmetros</TabsTrigger>
              <TabsTrigger value="memoria">Memória de Cálculo</TabsTrigger>
            </TabsList>

            <TabsContent value="params" className="space-y-3 pt-2">
              {tipo === "mao_de_obra" && <ParamsMaoDeObraReadonly params={paramsMO} />}
              {tipo === "equipamento" && <ParamsEquipamento params={paramsEq} onChange={setParamsEq} />}
              {tipo === "material" && <ParamsMaterialForm params={paramsMa} onChange={setParamsMa} />}
            </TabsContent>

            <TabsContent value="memoria" className="pt-2">
              <MemoriaCalculo memoria={resultado.memoria} />
            </TabsContent>
          </Tabs>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          {/* Resumo do item */}
          <div className="bg-primary/5 rounded-lg p-4 flex justify-between items-center border border-primary/20">
            <div>
              <div className="text-xs text-muted-foreground">Custo Unitário (por {unidade})</div>
              <div className="font-mono font-semibold">R$ {fmtBR(resultado.custo_unitario)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Custo Total ({quantidade} {unidade})</div>
              <div className="font-mono font-bold text-lg text-primary">R$ {fmtBR(resultado.custo_total)}</div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== Sub-forms =====

function NumField({ label, value, onChange, step = "0.01" }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="h-8 text-sm font-mono flex items-center px-3 bg-muted rounded-md">{value}</div>
    </div>
  );
}

function ParamsMaoDeObraReadonly({ params }: { params: ParametrosMaoDeObra }) {
  const fmtBR = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const isPJ = params.regime_contratacao === "pj";
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">Dados do Cargo (do cadastro)</div>
      <div className="grid grid-cols-3 gap-2">
        <ReadonlyField label="Salário Base (R$/mês)" value={`R$ ${fmtBR(params.salario_base)}`} />
        <ReadonlyField label="Encargos (%)" value={isPJ ? "PJ - isento" : `${fmtBR(params.encargos_percentual)}%`} />
        <ReadonlyField label="Benefícios (R$/mês)" value={isPJ ? "PJ - isento" : `R$ ${fmtBR(params.beneficios_valor)}`} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <ReadonlyField label="Horas/mês" value={`${fmtBR(params.horas_mes)} h`} />
        <ReadonlyField label="Horas/dia" value={`${fmtBR(params.horas_diarias)} h`} />
        <ReadonlyField label="Dias trab." value={params.regime_dias_trabalho > 0 ? String(params.regime_dias_trabalho) : "-"} />
        <ReadonlyField label="Dias folga" value={params.regime_dias_folga > 0 ? String(params.regime_dias_folga) : "-"} />
      </div>
    </div>
  );
}

function ParamsEquipamento({ params, onChange }: { params: ParametrosEquipamento; onChange: (p: ParametrosEquipamento) => void }) {
  const set = (k: keyof ParametrosEquipamento, v: number) => onChange({ ...params, [k]: v });
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">Aquisição e Depreciação</div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Valor Aquisição" value={params.valor_aquisicao} onChange={(v) => set("valor_aquisicao", v)} />
        <NumField label="Valor Residual" value={params.valor_residual} onChange={(v) => set("valor_residual", v)} />
        <NumField label="Vida Útil (h)" value={params.vida_util_horas} onChange={(v) => set("vida_util_horas", v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Depreciação/hora" value={params.depreciacao_hora} onChange={(v) => set("depreciacao_hora", v)} />
        <NumField label="Manutenção/hora" value={params.manutencao_hora} onChange={(v) => set("manutencao_hora", v)} />
      </div>
      <div className="text-xs font-semibold text-muted-foreground uppercase">Combustível e Operação</div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Consumo (L/h)" value={params.combustivel_consumo_hora} onChange={(v) => set("combustivel_consumo_hora", v)} />
        <NumField label="Preço Litro" value={params.combustivel_preco_litro} onChange={(v) => set("combustivel_preco_litro", v)} />
        <NumField label="Fator Utilização" value={params.fator_utilizacao} onChange={(v) => set("fator_utilizacao", v)} step="0.01" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Custo Operador/h" value={params.operador_custo_hora} onChange={(v) => set("operador_custo_hora", v)} />
        <NumField label="Custo/km" value={params.custo_km} onChange={(v) => set("custo_km", v)} />
      </div>
    </div>
  );
}

function ParamsMaterialForm({ params, onChange }: { params: ParametrosMaterial; onChange: (p: ParametrosMaterial) => void }) {
  const set = (k: keyof ParametrosMaterial, v: number) => onChange({ ...params, [k]: v });
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">Custo e Perdas</div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Custo Unitário" value={params.custo_unitario} onChange={(v) => set("custo_unitario", v)} />
        <NumField label="Perda (%)" value={params.perda_percentual} onChange={(v) => set("perda_percentual", v)} />
        <NumField label="Reaproveitamento (%)" value={params.reaproveitamento_percentual} onChange={(v) => set("reaproveitamento_percentual", v)} />
      </div>
      <div className="text-xs font-semibold text-muted-foreground uppercase">Vida Útil e Reposição</div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Vida Útil Estimada" value={params.vida_util_estimada} onChange={(v) => set("vida_util_estimada", v)} />
        <NumField label="Custo Reposição" value={params.custo_reposicao} onChange={(v) => set("custo_reposicao", v)} />
      </div>
    </div>
  );
}

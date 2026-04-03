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
  calcularMaoDeObra, calcularEquipamento, calcularVeiculo, calcularMaterial,
  getDefaultParamsMaoDeObra, getDefaultParamsEquipamento, getDefaultParamsVeiculo, getDefaultParamsMaterial,
  type ParametrosMaoDeObra, type ParametrosEquipamento, type ParametrosVeiculo, type ParametrosMaterial,
  type ResultadoCalculo,
} from "@/lib/composicao-calculo";

type TipoInsumo = "mao_de_obra" | "equipamento" | "veiculo" | "material";

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
  veiculo: "Veículo",
  material: "Material",
};

export function ComposicaoItemForm({ open, onOpenChange, tipoInicial = "mao_de_obra", initialValues, onSubmit, loading }: Props) {
  const [tipo, setTipo] = useState<TipoInsumo>(tipoInicial);
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [coeficiente, setCoeficiente] = useState(1);
  const [unidade, setUnidade] = useState("h");
  const [observacoes, setObservacoes] = useState("");
  const [insumoId, setInsumoId] = useState("");

  // Type-specific params
  const [paramsMO, setParamsMO] = useState<ParametrosMaoDeObra>(getDefaultParamsMaoDeObra());
  const [paramsEq, setParamsEq] = useState<ParametrosEquipamento>(getDefaultParamsEquipamento());
  const [paramsVe, setParamsVe] = useState<ParametrosVeiculo>(getDefaultParamsVeiculo());
  const [paramsMa, setParamsMa] = useState<ParametrosMaterial>(getDefaultParamsMaterial());

  // Cadastro data
  const { data: cargos } = useSupabaseQuery("cargos");
  const { data: encargos } = useSupabaseQuery("encargos_sociais");
  const { data: beneficios } = useSupabaseQuery("beneficios");
  const { data: jornadas } = useSupabaseQuery("jornadas_trabalho");
  const { data: regimes } = useSupabaseQuery("regimes_operacionais");
  const { data: equipamentos } = useSupabaseQuery("equipamentos");
  const { data: veiculos } = useSupabaseQuery("veiculos");
  const { data: materiais } = useSupabaseQuery("materiais");
  const { data: combustiveis } = useSupabaseQuery("combustiveis");

  useEffect(() => {
    if (initialValues) {
      setTipo((initialValues.tipo_insumo as TipoInsumo) || "mao_de_obra");
      setDescricao((initialValues.descricao as string) || "");
      setQuantidade(Number(initialValues.quantidade) || 1);
      setCoeficiente(Number(initialValues.coeficiente) || 1);
      setUnidade((initialValues.unidade as string) || "h");
      setObservacoes((initialValues.observacoes as string) || "");
      setInsumoId((initialValues.insumo_id as string) || "");
      const p = (initialValues.parametros as Record<string, unknown>) || {};
      if (initialValues.tipo_insumo === "mao_de_obra") setParamsMO({ ...getDefaultParamsMaoDeObra(), ...p } as ParametrosMaoDeObra);
      if (initialValues.tipo_insumo === "equipamento") setParamsEq({ ...getDefaultParamsEquipamento(), ...p } as ParametrosEquipamento);
      if (initialValues.tipo_insumo === "veiculo") setParamsVe({ ...getDefaultParamsVeiculo(), ...p } as ParametrosVeiculo);
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
        const totalEncargos = isPJ ? 0 : (encargos || []).filter((e) => e.ativo).reduce((s, e) => s + Number(e.percentual), 0);
        const totalBeneficios = isPJ ? 0 : (beneficios || []).filter((b) => b.ativo).reduce((s, b) => s + Number(b.valor), 0);
        const jornada = jornadas?.[0];
        const regime = regimes?.[0];
        setParamsMO((prev) => ({
          ...prev,
          salario_base: Number(cargo.salario_base),
          regime_contratacao: regimeContratacao as "clt" | "pj",
          encargos_percentual: totalEncargos,
          beneficios_valor: totalBeneficios,
          horas_mes: jornada ? Number(jornada.horas_por_mes) : 176,
          horas_diarias: jornada ? Number(jornada.horas_diarias) : 8,
          dias_mes: jornada ? Number(jornada.dias_por_semana) * 4.33 : 22,
          regime_dias_trabalho: regime ? Number(regime.dias_trabalho) : 0,
          regime_dias_folga: regime ? Number(regime.dias_folga) : 0,
        }));
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
    } else if (tipo === "veiculo") {
      const ve = veiculos?.find((v) => v.id === id);
      if (ve) {
        setDescricao(String(ve.nome));
        setUnidade(String(ve.unidade));
        const comb = combustiveis?.find((c) => c.ativo);
        setParamsVe((prev) => ({
          ...prev,
          custo_hora: Number(ve.custo_hora),
          manutencao_km: Number(ve.manutencao_hora),
          depreciacao_km: Number(ve.custo_km),
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

  const resultado: ResultadoCalculo = useMemo(() => {
    try {
      if (tipo === "mao_de_obra") return calcularMaoDeObra(paramsMO, quantidade, coeficiente);
      if (tipo === "equipamento") return calcularEquipamento(paramsEq, quantidade, coeficiente);
      if (tipo === "veiculo") return calcularVeiculo(paramsVe, quantidade, coeficiente);
      return calcularMaterial(paramsMa, quantidade, coeficiente);
    } catch {
      return { custo_unitario: 0, custo_total: 0, memoria: [] };
    }
  }, [tipo, paramsMO, paramsEq, paramsVe, paramsMa, quantidade, coeficiente]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = tipo === "mao_de_obra" ? paramsMO : tipo === "equipamento" ? paramsEq : tipo === "veiculo" ? paramsVe : paramsMa;
    onSubmit({
      tipo_insumo: tipo,
      insumo_id: insumoId || crypto.randomUUID(),
      descricao,
      quantidade,
      coeficiente,
      unidade,
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
    if (tipo === "veiculo") return (veiculos || []).map((v) => ({ id: String(v.id), nome: String(v.nome) }));
    return (materiais || []).map((m) => ({ id: String(m.id), nome: String(m.nome) }));
  }, [tipo, cargos, equipamentos, veiculos, materiais]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Editar Item" : "Novo Item"} — {tipoLabels[tipo]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo + Insumo */}
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

          {/* Campos comuns */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input type="number" step="0.0001" value={quantidade} onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Coeficiente</Label>
              <Input type="number" step="0.0001" value={coeficiente} onChange={(e) => setCoeficiente(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Parâmetros por tipo */}
          <Tabs defaultValue="params" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="params">Parâmetros</TabsTrigger>
              <TabsTrigger value="memoria">Memória de Cálculo</TabsTrigger>
            </TabsList>

            <TabsContent value="params" className="space-y-3 pt-2">
              {tipo === "mao_de_obra" && <ParamsMaoDeObra params={paramsMO} onChange={setParamsMO} />}
              {tipo === "equipamento" && <ParamsEquipamento params={paramsEq} onChange={setParamsEq} />}
              {tipo === "veiculo" && <ParamsVeiculo params={paramsVe} onChange={setParamsVe} />}
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
              <div className="text-xs text-muted-foreground">Custo Unitário</div>
              <div className="font-mono font-semibold">R$ {resultado.custo_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Custo Total</div>
              <div className="font-mono font-bold text-lg text-primary">R$ {resultado.custo_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
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

// ===== Sub-forms for each type =====

function NumField({ label, value, onChange, step = "0.01" }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
    </div>
  );
}

function ParamsMaoDeObra({ params, onChange }: { params: ParametrosMaoDeObra; onChange: (p: ParametrosMaoDeObra) => void }) {
  const set = (k: keyof ParametrosMaoDeObra, v: number) => onChange({ ...params, [k]: v });
  const isPJ = params.regime_contratacao === "pj";
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">Regime de Contratação</div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={!isPJ ? "default" : "outline"}
          className="text-xs flex-1"
          onClick={() => onChange({ ...params, regime_contratacao: "clt" })}
        >
          CLT (com encargos e benefícios)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isPJ ? "default" : "outline"}
          className="text-xs flex-1"
          onClick={() => onChange({ ...params, regime_contratacao: "pj", encargos_percentual: 0, beneficios_valor: 0 })}
        >
          PJ (apenas salário)
        </Button>
      </div>
      <div className="text-xs font-semibold text-muted-foreground uppercase">Remuneração</div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Salário Base (R$/mês)" value={params.salario_base} onChange={(v) => set("salario_base", v)} />
        {!isPJ && <NumField label="Encargos (%)" value={params.encargos_percentual} onChange={(v) => set("encargos_percentual", v)} />}
        {!isPJ && <NumField label="Benefícios (R$/mês)" value={params.beneficios_valor} onChange={(v) => set("beneficios_valor", v)} />}
        {isPJ && <div className="col-span-2 flex items-end text-xs text-muted-foreground pb-2">PJ: sem encargos e sem benefícios</div>}
      </div>
      <div className="text-xs font-semibold text-muted-foreground uppercase">Custos de Campo</div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Alimentação (R$/mês)" value={params.alimentacao} onChange={(v) => set("alimentacao", v)} />
        <NumField label="Hospedagem (R$/mês)" value={params.hospedagem} onChange={(v) => set("hospedagem", v)} />
        <NumField label="Transporte (R$/mês)" value={params.transporte} onChange={(v) => set("transporte", v)} />
      </div>
      <div className="text-xs font-semibold text-muted-foreground uppercase">Jornada e Regime</div>
      <div className="grid grid-cols-4 gap-2">
        <NumField label="Horas/mês" value={params.horas_mes} onChange={(v) => set("horas_mes", v)} />
        <NumField label="Horas/dia" value={params.horas_diarias} onChange={(v) => set("horas_diarias", v)} />
        <NumField label="Dias trab." value={params.regime_dias_trabalho} onChange={(v) => set("regime_dias_trabalho", v)} />
        <NumField label="Dias folga" value={params.regime_dias_folga} onChange={(v) => set("regime_dias_folga", v)} />
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

function ParamsVeiculo({ params, onChange }: { params: ParametrosVeiculo; onChange: (p: ParametrosVeiculo) => void }) {
  const set = (k: keyof ParametrosVeiculo, v: number) => onChange({ ...params, [k]: v });
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">Aquisição e Depreciação</div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Valor Aquisição" value={params.valor_aquisicao} onChange={(v) => set("valor_aquisicao", v)} />
        <NumField label="Valor Residual" value={params.valor_residual} onChange={(v) => set("valor_residual", v)} />
        <NumField label="Vida Útil (km)" value={params.vida_util_km} onChange={(v) => set("vida_util_km", v)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Depreciação/km" value={params.depreciacao_km} onChange={(v) => set("depreciacao_km", v)} />
        <NumField label="Manutenção/km" value={params.manutencao_km} onChange={(v) => set("manutencao_km", v)} />
        <NumField label="Custo/hora" value={params.custo_hora} onChange={(v) => set("custo_hora", v)} />
      </div>
      <div className="text-xs font-semibold text-muted-foreground uppercase">Combustível e Operação</div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Consumo (L/km)" value={params.combustivel_consumo_km} onChange={(v) => set("combustivel_consumo_km", v)} />
        <NumField label="Preço Litro" value={params.combustivel_preco_litro} onChange={(v) => set("combustivel_preco_litro", v)} />
        <NumField label="Fator Utilização" value={params.fator_utilizacao} onChange={(v) => set("fator_utilizacao", v)} step="0.01" />
      </div>
      <NumField label="Custo Operador/h" value={params.operador_custo_hora} onChange={(v) => set("operador_custo_hora", v)} />
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

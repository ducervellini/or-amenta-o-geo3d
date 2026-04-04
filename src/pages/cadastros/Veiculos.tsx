import { useState, useMemo } from "react";
import { useSupabaseQuery, useSupabaseInsert, useSupabaseUpdate, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search, Car, Calculator, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useTableSort, type SortDirection } from "@/components/ui/sortable-header";

const R = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface VeiculoForm {
  codigo: string; nome: string; unidade: string;
  tipo_propriedade: string;
  valor_aquisicao: number; valor_residual: number; vida_util_km: number;
  valor_aluguel_mensal: number; km_mensal_estimado: number;
  combustivel_consumo_km: number; combustivel_preco_litro: number;
  seguro_mensal: number;
  pneus_valor: number; pneus_vida_util_km: number;
  oleo_valor: number; oleo_troca_km: number;
  manutencao_preventiva_mensal: number; lavagem_mensal: number;
  horas_produtivas_mes: number; horas_improdutivas_mes: number;
}

const defaultForm: VeiculoForm = {
  codigo: "", nome: "", unidade: "h",
  tipo_propriedade: "proprio",
  valor_aquisicao: 0, valor_residual: 0, vida_util_km: 300000,
  valor_aluguel_mensal: 0, km_mensal_estimado: 3000,
  combustivel_consumo_km: 0, combustivel_preco_litro: 0,
  seguro_mensal: 0,
  pneus_valor: 0, pneus_vida_util_km: 50000,
  oleo_valor: 0, oleo_troca_km: 10000,
  manutencao_preventiva_mensal: 0, lavagem_mensal: 0,
  horas_produtivas_mes: 176, horas_improdutivas_mes: 0,
};

function calcVeic(f: VeiculoForm) {
  const isProprio = f.tipo_propriedade === "proprio";
  const depKm = isProprio && f.vida_util_km > 0 ? (f.valor_aquisicao - f.valor_residual) / f.vida_util_km : 0;
  const retornoCapitalKm = isProprio && f.vida_util_km > 0 ? f.valor_residual / f.vida_util_km : 0;
  const combKm = f.combustivel_consumo_km * f.combustivel_preco_litro;
  const pneusKm = f.pneus_vida_util_km > 0 ? f.pneus_valor / f.pneus_vida_util_km : 0;
  const oleoKm = f.oleo_troca_km > 0 ? f.oleo_valor / f.oleo_troca_km : 0;
  const custoKm = depKm + combKm + pneusKm + oleoKm;

  const km = f.km_mensal_estimado || 1;
  const seguroKm = f.seguro_mensal / km;
  const manutKm = f.manutencao_preventiva_mensal / km;
  const lavagemKm = f.lavagem_mensal / km;
  const aluguelKm = isProprio ? 0 : f.valor_aluguel_mensal / km;

  const custoKmTotal = custoKm + seguroKm + manutKm + lavagemKm + aluguelKm;
  const custoKmLiquido = custoKmTotal - retornoCapitalKm;

  const hTotalMes = f.horas_produtivas_mes + f.horas_improdutivas_mes;
  const custoHora = hTotalMes > 0 ? (custoKmTotal * km) / hTotalMes : 0;
  const totalMes = custoKmTotal * km;
  const totalMesLiquido = custoKmLiquido * km;

  return { depKm, retornoCapitalKm, combKm, pneusKm, oleoKm, custoKm, custoKmTotal, custoKmLiquido, custoHora, totalMes, totalMesLiquido, seguroKm, manutKm, lavagemKm, aluguelKm, isProprio };
}

export default function Veiculos() {
  const { data, isLoading: loading } = useSupabaseQuery("veiculos");
  const insertMut = useSupabaseInsert("veiculos");
  const updateMut = useSupabaseUpdate("veiculos");
  const deleteMut = useSupabaseDelete("veiculos");
  const create = (v: any) => insertMut.mutateAsync(v);
  const update = (id: string, v: any) => updateMut.mutateAsync({ id, values: v });
  const remove = (id: string) => deleteMut.mutateAsync(id);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VeiculoForm>({ ...defaultForm });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((r: any) => r.nome?.toLowerCase().includes(search.toLowerCase()) || r.codigo?.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const setField = (name: keyof VeiculoForm, value: any) => setForm(p => ({ ...p, [name]: value }));
  const setNum = (name: keyof VeiculoForm, v: string) => setField(name, parseFloat(v) || 0);

  const calc = calcVeic(form);

  const openNew = () => { setEditId(null); setForm({ ...defaultForm }); setDialogOpen(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    const f: VeiculoForm = { ...defaultForm };
    for (const k of Object.keys(defaultForm) as (keyof VeiculoForm)[]) {
      if (typeof defaultForm[k] === "number") (f as any)[k] = Number(row[k]) || (defaultForm as any)[k];
      else (f as any)[k] = row[k] || (defaultForm as any)[k];
    }
    setForm(f);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.codigo || !form.nome) { toast.error("Código e nome são obrigatórios"); return; }
    const c = calcVeic(form);
    const payload = {
      ...form,
      custo_km: c.custoKmTotal,
      custo_hora: c.custoHora,
      manutencao_hora: c.manutKm * (form.km_mensal_estimado / (form.horas_produtivas_mes || 1)),
    };
    if (editId) await update(editId, payload);
    else await create(payload);
    setDialogOpen(false);
  };

  const isProprio = form.tipo_propriedade === "proprio";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Veículos</h1>
          <p className="text-muted-foreground">Cadastro com cálculo automático de depreciação, custo/km e custo/hora</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Veículo</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Deprec./km</TableHead>
              <TableHead className="text-right">Custo/km</TableHead>
              <TableHead className="text-right">Custo/hora</TableHead>
              <TableHead className="text-right">Custo/mês</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row: any) => {
              const f: VeiculoForm = { ...defaultForm };
              for (const k of Object.keys(defaultForm) as (keyof VeiculoForm)[]) {
                if (typeof defaultForm[k] === "number") (f as any)[k] = Number(row[k]) || (defaultForm as any)[k];
                else (f as any)[k] = row[k] || (defaultForm as any)[k];
              }
              const rc = calcVeic(f);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-accent">{row.codigo}</TableCell>
                  <TableCell className="font-medium">{row.nome}</TableCell>
                  <TableCell>
                    <Badge variant={row.tipo_propriedade === "proprio" ? "default" : "secondary"}>
                      {row.tipo_propriedade === "proprio" || !row.tipo_propriedade ? "Próprio" : "Alugado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{R(rc.depKm)}</TableCell>
                  <TableCell className="text-right font-medium">{R(rc.custoKmTotal)}</TableCell>
                  <TableCell className="text-right font-medium">{R(rc.custoHora)}</TableCell>
                  <TableCell className="text-right font-medium">{R(rc.totalMes)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum veículo cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Car className="h-5 w-5" />{editId ? "Editar" : "Novo"} Veículo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6">
            {/* Identificação */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setField("codigo", e.target.value)} placeholder="VE-001" /></div>
              <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setField("nome", e.target.value)} /></div>
            </div>

            <Tabs defaultValue="propriedade">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="propriedade">Propriedade</TabsTrigger>
                <TabsTrigger value="operacional">Custos Operacionais</TabsTrigger>
                <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
              </TabsList>

              <TabsContent value="propriedade" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Tipo de Propriedade</Label>
                    <Select value={form.tipo_propriedade} onValueChange={v => setField("tipo_propriedade", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proprio">Próprio</SelectItem>
                        <SelectItem value="alugado">Alugado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isProprio ? (
                    <>
                      <div><Label>Valor Aquisição (R$)</Label><Input type="number" value={form.valor_aquisicao || ""} onChange={e => setNum("valor_aquisicao", e.target.value)} /></div>
                      <div><Label>Valor de Revenda (R$)</Label><Input type="number" value={form.valor_residual || ""} onChange={e => setNum("valor_residual", e.target.value)} placeholder="Valor futuro de venda" /></div>
                      <div><Label>Vida Útil (km)</Label><Input type="number" value={form.vida_util_km || ""} onChange={e => setNum("vida_util_km", e.target.value)} /></div>
                    </>
                  ) : (
                    <div><Label>Aluguel mensal (R$)</Label><Input type="number" value={form.valor_aluguel_mensal || ""} onChange={e => setNum("valor_aluguel_mensal", e.target.value)} /></div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Km mensal estimado</Label><Input type="number" value={form.km_mensal_estimado || ""} onChange={e => setNum("km_mensal_estimado", e.target.value)} /></div>
                  <div><Label>Seguro mensal (R$)</Label><Input type="number" value={form.seguro_mensal || ""} onChange={e => setNum("seguro_mensal", e.target.value)} /></div>
                </div>
              </TabsContent>

              <TabsContent value="operacional" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><Label>Consumo combustível (L/km)</Label><Input type="number" step="0.01" value={form.combustivel_consumo_km || ""} onChange={e => setNum("combustivel_consumo_km", e.target.value)} /></div>
                  <div><Label>Preço combustível (R$/L)</Label><Input type="number" value={form.combustivel_preco_litro || ""} onChange={e => setNum("combustivel_preco_litro", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Horas produtivas/mês</Label><Input type="number" value={form.horas_produtivas_mes || ""} onChange={e => setNum("horas_produtivas_mes", e.target.value)} /></div>
                  <div><Label>Horas improdutivas/mês</Label><Input type="number" value={form.horas_improdutivas_mes || ""} onChange={e => setNum("horas_improdutivas_mes", e.target.value)} /></div>
                </div>
              </TabsContent>

              <TabsContent value="manutencao" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><Label>Jogo de pneus (R$)</Label><Input type="number" value={form.pneus_valor || ""} onChange={e => setNum("pneus_valor", e.target.value)} /></div>
                  <div><Label>Vida útil pneus (km)</Label><Input type="number" value={form.pneus_vida_util_km || ""} onChange={e => setNum("pneus_vida_util_km", e.target.value)} /></div>
                  <div><Label>Troca de óleo (R$)</Label><Input type="number" value={form.oleo_valor || ""} onChange={e => setNum("oleo_valor", e.target.value)} /></div>
                  <div><Label>Intervalo troca (km)</Label><Input type="number" value={form.oleo_troca_km || ""} onChange={e => setNum("oleo_troca_km", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Manutenção preventiva/mês (R$)</Label><Input type="number" value={form.manutencao_preventiva_mensal || ""} onChange={e => setNum("manutencao_preventiva_mensal", e.target.value)} /></div>
                  <div><Label>Lavagem/mês (R$)</Label><Input type="number" value={form.lavagem_mensal || ""} onChange={e => setNum("lavagem_mensal", e.target.value)} /></div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Resumo calculado */}
            <Card className="bg-muted/50 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" />Cálculos Automáticos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {isProprio && (
                    <div>
                      <p className="text-muted-foreground">Depreciação/km</p>
                      <p className="font-bold text-foreground">{R(calc.depKm)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Combustível/km</p>
                    <p className="font-bold text-foreground">{R(calc.combKm)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pneus/km</p>
                    <p className="font-bold text-foreground">{R(calc.pneusKm)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Óleo/km</p>
                    <p className="font-bold text-foreground">{R(calc.oleoKm)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo/km total</p>
                    <p className="font-bold text-lg text-primary">{R(calc.custoKmTotal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo/hora</p>
                    <p className="font-bold text-lg text-primary">{R(calc.custoHora)}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <p className="text-muted-foreground">Custo mensal estimado</p>
                    <p className="font-bold text-lg text-primary">{R(calc.totalMes)}</p>
                    <p className="text-xs text-muted-foreground">{R(calc.custoKmTotal)}/km × {form.km_mensal_estimado} km</p>
                  </div>
                  {isProprio && calc.retornoCapitalKm > 0 && (
                    <div className="col-span-2 md:col-span-4 pt-2 border-t border-dashed">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Custo líquido/km (- retorno capital)</p>
                          <p className="font-semibold text-foreground">{R(calc.custoKmLiquido)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Custo líquido/mês (- retorno capital)</p>
                          <p className="font-semibold text-foreground">{R(calc.totalMesLiquido)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editId ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

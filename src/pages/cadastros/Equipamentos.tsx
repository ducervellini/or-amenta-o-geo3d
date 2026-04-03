import { useState, useEffect, useMemo } from "react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Search, Wrench, Calculator } from "lucide-react";
import { toast } from "sonner";

const R = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface EquipamentoForm {
  codigo: string;
  nome: string;
  potencia: string;
  unidade: string;
  tipo_propriedade: string;
  valor_aquisicao: number;
  valor_residual: number;
  vida_util_horas: number;
  valor_aluguel_hora: number;
  manutencao_hora: number;
  combustivel_consumo_hora: number;
  combustivel_preco_litro: number;
  horas_produtivas_mes: number;
  horas_improdutivas_mes: number;
}

const defaultForm: EquipamentoForm = {
  codigo: "", nome: "", potencia: "", unidade: "h",
  tipo_propriedade: "proprio", valor_aquisicao: 0, valor_residual: 0,
  vida_util_horas: 10000, valor_aluguel_hora: 0, manutencao_hora: 0,
  combustivel_consumo_hora: 0, combustivel_preco_litro: 0,
  horas_produtivas_mes: 176, horas_improdutivas_mes: 0,
};

function calcEquip(f: EquipamentoForm) {
  const isProprio = f.tipo_propriedade === "proprio";
  const depHora = isProprio && f.vida_util_horas > 0
    ? (f.valor_aquisicao - f.valor_residual) / f.vida_util_horas : 0;
  const combHora = f.combustivel_consumo_hora * f.combustivel_preco_litro;
  const custoProd = isProprio
    ? depHora + f.manutencao_hora + combHora
    : f.valor_aluguel_hora + f.manutencao_hora + combHora;
  const custoImprod = isProprio ? depHora : f.valor_aluguel_hora;
  const totalMes = (custoProd * f.horas_produtivas_mes) + (custoImprod * f.horas_improdutivas_mes);
  return { depHora, combHora, custoProd, custoImprod, totalMes };
}

export default function Equipamentos() {
  const { data, loading, create, update, remove } = useSupabaseCrud("equipamentos" as any);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipamentoForm>({ ...defaultForm });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((r: any) => r.nome?.toLowerCase().includes(search.toLowerCase()) || r.codigo?.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const setField = (name: keyof EquipamentoForm, value: any) => setForm(p => ({ ...p, [name]: value }));
  const setNum = (name: keyof EquipamentoForm, v: string) => setField(name, parseFloat(v) || 0);

  const calc = calcEquip(form);

  const openNew = () => { setEditId(null); setForm({ ...defaultForm }); setDialogOpen(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({
      codigo: row.codigo || "", nome: row.nome || "", potencia: row.potencia || "", unidade: row.unidade || "h",
      tipo_propriedade: row.tipo_propriedade || "proprio",
      valor_aquisicao: Number(row.valor_aquisicao) || 0, valor_residual: Number(row.valor_residual) || 0,
      vida_util_horas: Number(row.vida_util_horas) || 10000,
      valor_aluguel_hora: Number(row.valor_aluguel_hora) || 0,
      manutencao_hora: Number(row.manutencao_hora) || 0,
      combustivel_consumo_hora: Number(row.combustivel_consumo_hora) || 0,
      combustivel_preco_litro: Number(row.combustivel_preco_litro) || 0,
      horas_produtivas_mes: Number(row.horas_produtivas_mes) || 176,
      horas_improdutivas_mes: Number(row.horas_improdutivas_mes) || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.codigo || !form.nome) { toast.error("Código e nome são obrigatórios"); return; }
    const c = calcEquip(form);
    const payload = {
      ...form,
      custo_hora_produtiva: c.custoProd,
      custo_hora_improdutiva: c.custoImprod,
      depreciacao_hora: c.depHora,
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
          <h1 className="text-2xl font-bold text-foreground">Equipamentos</h1>
          <p className="text-muted-foreground">Cadastro com cálculo automático de depreciação e custo/hora</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Equipamento</Button>
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
              <TableHead>Equipamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Deprec./h</TableHead>
              <TableHead className="text-right">Custo/h Prod.</TableHead>
              <TableHead className="text-right">Custo/h Improd.</TableHead>
              <TableHead className="text-right">Custo/mês</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row: any) => {
              const rc = calcEquip({
                ...defaultForm,
                tipo_propriedade: row.tipo_propriedade || "proprio",
                valor_aquisicao: Number(row.valor_aquisicao) || 0,
                valor_residual: Number(row.valor_residual) || 0,
                vida_util_horas: Number(row.vida_util_horas) || 10000,
                valor_aluguel_hora: Number(row.valor_aluguel_hora) || 0,
                manutencao_hora: Number(row.manutencao_hora) || 0,
                combustivel_consumo_hora: Number(row.combustivel_consumo_hora) || 0,
                combustivel_preco_litro: Number(row.combustivel_preco_litro) || 0,
                horas_produtivas_mes: Number(row.horas_produtivas_mes) || 176,
                horas_improdutivas_mes: Number(row.horas_improdutivas_mes) || 0,
              });
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-accent">{row.codigo}</TableCell>
                  <TableCell className="font-medium">{row.nome}</TableCell>
                  <TableCell>
                    <Badge variant={row.tipo_propriedade === "proprio" ? "default" : "secondary"}>
                      {row.tipo_propriedade === "proprio" ? "Próprio" : "Alugado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{R(rc.depHora)}</TableCell>
                  <TableCell className="text-right font-medium">{R(rc.custoProd)}</TableCell>
                  <TableCell className="text-right">{R(rc.custoImprod)}</TableCell>
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
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum equipamento cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />{editId ? "Editar" : "Novo"} Equipamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6">
            {/* Identificação */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setField("codigo", e.target.value)} placeholder="EQ-001" /></div>
              <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setField("nome", e.target.value)} /></div>
              <div><Label>Potência</Label><Input value={form.potencia} onChange={e => setField("potencia", e.target.value)} placeholder="HP, CV" /></div>
            </div>

            <Separator />

            {/* Propriedade */}
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
                  <div><Label>Valor Residual (R$)</Label><Input type="number" value={form.valor_residual || ""} onChange={e => setNum("valor_residual", e.target.value)} /></div>
                  <div><Label>Vida Útil (horas)</Label><Input type="number" value={form.vida_util_horas || ""} onChange={e => setNum("vida_util_horas", e.target.value)} /></div>
                </>
              ) : (
                <div><Label>Aluguel/hora (R$)</Label><Input type="number" value={form.valor_aluguel_hora || ""} onChange={e => setNum("valor_aluguel_hora", e.target.value)} /></div>
              )}
            </div>

            <Separator />

            {/* Custos operacionais */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><Label>Manutenção/hora (R$)</Label><Input type="number" value={form.manutencao_hora || ""} onChange={e => setNum("manutencao_hora", e.target.value)} /></div>
              <div><Label>Consumo combustível (L/h)</Label><Input type="number" value={form.combustivel_consumo_hora || ""} onChange={e => setNum("combustivel_consumo_hora", e.target.value)} /></div>
              <div><Label>Preço combustível (R$/L)</Label><Input type="number" value={form.combustivel_preco_litro || ""} onChange={e => setNum("combustivel_preco_litro", e.target.value)} /></div>
            </div>

            <Separator />

            {/* Utilização */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Horas produtivas/mês</Label><Input type="number" value={form.horas_produtivas_mes || ""} onChange={e => setNum("horas_produtivas_mes", e.target.value)} /></div>
              <div><Label>Horas improdutivas/mês</Label><Input type="number" value={form.horas_improdutivas_mes || ""} onChange={e => setNum("horas_improdutivas_mes", e.target.value)} /></div>
            </div>

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
                      <p className="text-muted-foreground">Depreciação/hora</p>
                      <p className="font-bold text-foreground">{R(calc.depHora)}</p>
                      <p className="text-xs text-muted-foreground">(Aquisição - Residual) / Vida útil</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Combustível/hora</p>
                    <p className="font-bold text-foreground">{R(calc.combHora)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo/h Produtiva</p>
                    <p className="font-bold text-lg text-primary">{R(calc.custoProd)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo/h Improdutiva</p>
                    <p className="font-bold text-foreground">{R(calc.custoImprod)}</p>
                  </div>
                  <div className="col-span-2 md:col-span-4 pt-2 border-t">
                    <p className="text-muted-foreground">Custo mensal estimado</p>
                    <p className="font-bold text-lg text-primary">{R(calc.totalMes)}</p>
                    <p className="text-xs text-muted-foreground">({form.horas_produtivas_mes}h prod × {R(calc.custoProd)}) + ({form.horas_improdutivas_mes}h improd × {R(calc.custoImprod)})</p>
                  </div>
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

import { useState, useMemo } from "react";
import { useSupabaseQuery, useSupabaseInsert, useSupabaseUpdate, useSupabaseDelete } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Search, Wrench, Calculator, FileText } from "lucide-react";
import { toast } from "sonner";

const R = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface EquipamentoForm {
  codigo: string; nome: string; potencia: string; unidade: string;
  tipo_propriedade: string;
  valor_aquisicao: number; valor_residual: number; vida_util_horas: number;
  valor_aluguel_hora: number; manutencao_hora: number;
  combustivel_consumo_hora: number; combustivel_preco_litro: number;
  horas_produtivas_mes: number; horas_improdutivas_mes: number;
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
  const retornoCapitalHora = isProprio && f.vida_util_horas > 0
    ? f.valor_residual / f.vida_util_horas : 0;
  const combHora = f.combustivel_consumo_hora * f.combustivel_preco_litro;
  const custoHora = isProprio
    ? depHora + f.manutencao_hora + combHora
    : f.valor_aluguel_hora + f.manutencao_hora + combHora;
  const custoHoraLiquido = custoHora - retornoCapitalHora;
  const hTotalMes = f.horas_produtivas_mes + f.horas_improdutivas_mes;
  const custoMes = custoHora * hTotalMes;
  const custoMesLiquido = custoHoraLiquido * hTotalMes;
  return { depHora, retornoCapitalHora, combHora, custoHora, custoHoraLiquido, custoMes, custoMesLiquido, isProprio };
}

function rowToForm(row: any): EquipamentoForm {
  return {
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
  };
}

export default function Equipamentos() {
  const { data } = useSupabaseQuery("equipamentos");
  const insertMut = useSupabaseInsert("equipamentos");
  const updateMut = useSupabaseUpdate("equipamentos");
  const deleteMut = useSupabaseDelete("equipamentos");
  const create = (v: any) => insertMut.mutateAsync(v);
  const update = (id: string, v: any) => updateMut.mutateAsync({ id, values: v });
  const remove = (id: string) => deleteMut.mutateAsync(id);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipamentoForm>({ ...defaultForm });
  const [detailForm, setDetailForm] = useState<EquipamentoForm>({ ...defaultForm });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((r: any) => r.nome?.toLowerCase().includes(search.toLowerCase()) || r.codigo?.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const setField = (name: keyof EquipamentoForm, value: any) => setForm(p => ({ ...p, [name]: value }));
  const setNum = (name: keyof EquipamentoForm, v: string) => setField(name, parseFloat(v) || 0);

  const calc = calcEquip(form);

  const openNew = () => { setEditId(null); setForm({ ...defaultForm }); setDialogOpen(true); };
  const openEdit = (row: any) => { setEditId(row.id); setForm(rowToForm(row)); setDialogOpen(true); };
  const openDetail = (row: any) => { setDetailForm(rowToForm(row)); setDetailOpen(true); };

  const handleSave = async () => {
    if (!form.codigo || !form.nome) { toast.error("Código e nome são obrigatórios"); return; }
    const c = calcEquip(form);
    const payload = {
      ...form,
      custo_hora_produtiva: c.custoHora,
      custo_hora_improdutiva: c.custoHora,
      depreciacao_hora: c.depHora,
    };
    if (editId) await update(editId, payload);
    else await create(payload);
    setDialogOpen(false);
  };

  const isProprio = form.tipo_propriedade === "proprio";
  const dc = calcEquip(detailForm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipamentos</h1>
          <p className="text-muted-foreground">Cadastro com cálculo automático de custo/hora e custo/mês</p>
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
              <TableHead className="text-right">Custo/hora</TableHead>
              <TableHead className="text-right">Custo/mês</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row: any) => {
              const rc = calcEquip(rowToForm(row));
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-accent">{row.codigo}</TableCell>
                  <TableCell className="font-medium">{row.nome}</TableCell>
                  <TableCell>
                    <Badge variant={row.tipo_propriedade === "proprio" || !row.tipo_propriedade ? "default" : "secondary"}>
                      {row.tipo_propriedade === "proprio" || !row.tipo_propriedade ? "Próprio" : "Alugado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{R(rc.custoHora)}</TableCell>
                  <TableCell className="text-right font-medium">{R(rc.custoMes)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Ver cálculo detalhado" onClick={() => openDetail(row)}><FileText className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Excluir" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum equipamento cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de edição/criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />{editId ? "Editar" : "Novo"} Equipamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setField("codigo", e.target.value)} placeholder="EQ-001" /></div>
              <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setField("nome", e.target.value)} /></div>
              <div><Label>Potência</Label><Input value={form.potencia} onChange={e => setField("potencia", e.target.value)} placeholder="HP, CV" /></div>
            </div>

            <Separator />

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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><Label>Manutenção/hora (R$)</Label><Input type="number" value={form.manutencao_hora || ""} onChange={e => setNum("manutencao_hora", e.target.value)} /></div>
              <div><Label>Consumo combustível (L/h)</Label><Input type="number" value={form.combustivel_consumo_hora || ""} onChange={e => setNum("combustivel_consumo_hora", e.target.value)} /></div>
              <div><Label>Preço combustível (R$/L)</Label><Input type="number" value={form.combustivel_preco_litro || ""} onChange={e => setNum("combustivel_preco_litro", e.target.value)} /></div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Horas produtivas/mês</Label><Input type="number" value={form.horas_produtivas_mes || ""} onChange={e => setNum("horas_produtivas_mes", e.target.value)} /></div>
              <div><Label>Horas improdutivas/mês</Label><Input type="number" value={form.horas_improdutivas_mes || ""} onChange={e => setNum("horas_improdutivas_mes", e.target.value)} /></div>
            </div>

            <Separator />

            {/* Resumo simplificado */}
            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Custo/hora</p>
                    <p className="text-2xl font-bold text-primary">{R(calc.custoHora)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo/mês</p>
                    <p className="text-2xl font-bold text-primary">{R(calc.custoMes)}</p>
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

      {/* Dialog de cálculo detalhado */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Cálculo Detalhado — {detailForm.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="font-medium text-muted-foreground uppercase text-xs tracking-wide">
              {detailForm.tipo_propriedade === "proprio" ? "Equipamento Próprio" : "Equipamento Alugado"}
            </div>

            {dc.isProprio ? (
              <>
                <Row label="Valor de aquisição" value={R(detailForm.valor_aquisicao)} />
                <Row label="Valor residual" value={R(detailForm.valor_residual)} />
                <Row label="Vida útil" value={`${detailForm.vida_util_horas.toLocaleString("pt-BR")} horas`} />
                <Row label="Depreciação/hora" value={R(dc.depHora)} formula={`(${R(detailForm.valor_aquisicao)} - ${R(detailForm.valor_residual)}) / ${detailForm.vida_util_horas.toLocaleString("pt-BR")} h`} highlight />
              </>
            ) : (
              <Row label="Aluguel/hora" value={R(detailForm.valor_aluguel_hora)} />
            )}

            <Separator />
            <Row label="Manutenção/hora" value={R(detailForm.manutencao_hora)} />
            <Row label="Consumo combustível" value={`${detailForm.combustivel_consumo_hora} L/h`} />
            <Row label="Preço combustível" value={`${R(detailForm.combustivel_preco_litro)}/L`} />
            <Row label="Combustível/hora" value={R(dc.combHora)} formula={`${detailForm.combustivel_consumo_hora} L × ${R(detailForm.combustivel_preco_litro)}`} highlight />

            <Separator />
            <Row label="Horas produtivas/mês" value={`${detailForm.horas_produtivas_mes} h`} />
            <Row label="Horas improdutivas/mês" value={`${detailForm.horas_improdutivas_mes} h`} />
            <Row label="Total horas/mês" value={`${detailForm.horas_produtivas_mes + detailForm.horas_improdutivas_mes} h`} />

            <Separator />
            <div className="bg-primary/10 rounded-lg p-4 space-y-2">
              <Row label="CUSTO / HORA" value={R(dc.custoHora)}
                formula={dc.isProprio
                  ? `${R(dc.depHora)} + ${R(detailForm.manutencao_hora)} + ${R(dc.combHora)}`
                  : `${R(detailForm.valor_aluguel_hora)} + ${R(detailForm.manutencao_hora)} + ${R(dc.combHora)}`}
                large />
              <Row label="CUSTO / MÊS" value={R(dc.custoMes)}
                formula={`${R(dc.custoHora)} × ${detailForm.horas_produtivas_mes + detailForm.horas_improdutivas_mes} h`}
                large />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, formula, highlight, large }: { label: string; value: string; formula?: string; highlight?: boolean; large?: boolean }) {
  return (
    <div className={`flex justify-between items-start ${large ? "pt-1" : ""}`}>
      <div>
        <p className={`${large ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {formula && <p className="text-xs text-muted-foreground/70">{formula}</p>}
      </div>
      <p className={`${large ? "text-lg font-bold text-primary" : highlight ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

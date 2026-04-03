import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockData = [
  { id: "EQ-001", nome: "Escavadeira Hidráulica CAT 320", custoHoraProd: 320.00, custoHoraImprod: 180.00, depreciacao: 45.00, unidade: "h" },
  { id: "EQ-002", nome: "Retroescavadeira JCB 3CX", custoHoraProd: 185.00, custoHoraImprod: 95.00, depreciacao: 28.00, unidade: "h" },
  { id: "EQ-003", nome: "Rolo Compactador Vibratório", custoHoraProd: 210.00, custoHoraImprod: 110.00, depreciacao: 32.00, unidade: "h" },
  { id: "EQ-004", nome: "Estação Total Leica TS16", custoHoraProd: 85.00, custoHoraImprod: 45.00, depreciacao: 12.00, unidade: "h" },
];

export default function Equipamentos() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Equipamentos</h1>
          <p className="page-subtitle">Cadastro de equipamentos e custos operacionais</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Equipamento
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar equipamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-ring outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Equipamento</th>
                <th>Custo/h Prod.</th>
                <th>Custo/h Improd.</th>
                <th>Depreciação/h</th>
                <th>Unidade</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="font-medium text-accent">{e.id}</td>
                  <td className="font-medium">{e.nome}</td>
                  <td>R$ {e.custoHoraProd.toFixed(2)}</td>
                  <td>R$ {e.custoHoraImprod.toFixed(2)}</td>
                  <td>R$ {e.depreciacao.toFixed(2)}</td>
                  <td>{e.unidade}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

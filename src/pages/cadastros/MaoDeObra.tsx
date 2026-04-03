import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Worker {
  id: string;
  cargo: string;
  salarioBase: number;
  encargos: number;
  custoHora: number;
  unidade: string;
}

const mockData: Worker[] = [
  { id: "MO-001", cargo: "Engenheiro Civil Sênior", salarioBase: 18500, encargos: 78.5, custoHora: 185.20, unidade: "h" },
  { id: "MO-002", cargo: "Técnico em Topografia", salarioBase: 6800, encargos: 78.5, custoHora: 68.10, unidade: "h" },
  { id: "MO-003", cargo: "Operador de Máquinas", salarioBase: 5200, encargos: 78.5, custoHora: 52.05, unidade: "h" },
  { id: "MO-004", cargo: "Servente", salarioBase: 2800, encargos: 78.5, custoHora: 28.02, unidade: "h" },
  { id: "MO-005", cargo: "Encarregado de Obras", salarioBase: 7500, encargos: 78.5, custoHora: 75.08, unidade: "h" },
];

export default function MaoDeObra() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((w) =>
    w.cargo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Mão de Obra</h1>
          <p className="page-subtitle">Cadastro de profissionais e custos unitários</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Registro
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cargo..."
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
                <th>Cargo / Função</th>
                <th>Salário Base</th>
                <th>Encargos (%)</th>
                <th>Custo/Hora</th>
                <th>Unidade</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id}>
                  <td className="font-medium text-accent">{w.id}</td>
                  <td className="font-medium">{w.cargo}</td>
                  <td>R$ {w.salarioBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td>{w.encargos}%</td>
                  <td className="font-semibold">R$ {w.custoHora.toFixed(2)}</td>
                  <td>{w.unidade}</td>
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

import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockData = [
  { id: "VE-001", nome: "Caminhão Basculante 12m³", custoKm: 4.80, custoHora: 120.00, manutencao: 15.00, unidade: "h" },
  { id: "VE-002", nome: "Pickup 4x4 Toyota Hilux", custoKm: 2.10, custoHora: 55.00, manutencao: 8.00, unidade: "h" },
  { id: "VE-003", nome: "Caminhão Prancha", custoKm: 6.50, custoHora: 180.00, manutencao: 22.00, unidade: "h" },
];

export default function Veiculos() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((v) =>
    v.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Veículos</h1>
          <p className="page-subtitle">Cadastro de veículos e custos operacionais</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Veículo
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar veículo..."
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
                <th>Veículo</th>
                <th>Custo/Km</th>
                <th>Custo/Hora</th>
                <th>Manutenção/h</th>
                <th>Unidade</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium text-accent">{v.id}</td>
                  <td className="font-medium">{v.nome}</td>
                  <td>R$ {v.custoKm.toFixed(2)}</td>
                  <td>R$ {v.custoHora.toFixed(2)}</td>
                  <td>R$ {v.manutencao.toFixed(2)}</td>
                  <td>{v.unidade}</td>
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

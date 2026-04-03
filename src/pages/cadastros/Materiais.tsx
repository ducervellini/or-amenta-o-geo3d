import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockData = [
  { id: "MAT-001", nome: "Cimento CP-II F-32 (50kg)", unidade: "sc", preco: 38.50, fornecedor: "Votorantim" },
  { id: "MAT-002", nome: "Brita 1 (m³)", unidade: "m³", preco: 95.00, fornecedor: "Pedreira São José" },
  { id: "MAT-003", nome: "Aço CA-50 (12.5mm)", unidade: "kg", preco: 7.80, fornecedor: "Gerdau" },
  { id: "MAT-004", nome: "Tubo PEAD 200mm", unidade: "m", preco: 145.00, fornecedor: "Tigre" },
  { id: "MAT-005", nome: "Areia Média Lavada", unidade: "m³", preco: 120.00, fornecedor: "Areeiro Central" },
];

export default function Materiais() {
  const [search, setSearch] = useState("");
  const filtered = mockData.filter((m) =>
    m.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Materiais</h1>
          <p className="page-subtitle">Cadastro de materiais e preços unitários</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Material
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar material..."
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
                <th>Material</th>
                <th>Unidade</th>
                <th>Preço Unitário</th>
                <th>Fornecedor</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-accent">{m.id}</td>
                  <td className="font-medium">{m.nome}</td>
                  <td>{m.unidade}</td>
                  <td className="font-semibold">R$ {m.preco.toFixed(2)}</td>
                  <td>{m.fornecedor}</td>
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

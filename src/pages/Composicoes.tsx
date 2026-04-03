import { useState } from "react";
import { Plus, Search, Eye, Copy, Edit, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockComposicoes = [
  {
    id: "COMP-001",
    nome: "Escavação Mecânica de Vala",
    unidade: "m³",
    custoUnitario: 42.80,
    grupo: "Terraplanagem",
    insumos: 5,
  },
  {
    id: "COMP-002",
    nome: "Concreto Usinado FCK 25 MPa",
    unidade: "m³",
    custoUnitario: 485.50,
    grupo: "Estrutura",
    insumos: 8,
  },
  {
    id: "COMP-003",
    nome: "Levantamento Topográfico Planialtimétrico",
    unidade: "ha",
    custoUnitario: 1250.00,
    grupo: "Topografia",
    insumos: 4,
  },
  {
    id: "COMP-004",
    nome: "Sondagem SPT",
    unidade: "m",
    custoUnitario: 85.00,
    grupo: "Geotecnia",
    insumos: 6,
  },
];

export default function Composicoes() {
  const [search, setSearch] = useState("");
  const filtered = mockComposicoes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.grupo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Composições de Serviço</h1>
          <p className="page-subtitle">
            Composições analíticas de custos unitários
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Composição
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar composição ou grupo..."
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
                <th>Composição</th>
                <th>Grupo</th>
                <th>Unidade</th>
                <th>Insumos</th>
                <th>Custo Unitário</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-accent">{c.id}</td>
                  <td className="font-medium">{c.nome}</td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {c.grupo}
                    </span>
                  </td>
                  <td>{c.unidade}</td>
                  <td>{c.insumos}</td>
                  <td className="font-semibold">
                    R$ {c.custoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
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

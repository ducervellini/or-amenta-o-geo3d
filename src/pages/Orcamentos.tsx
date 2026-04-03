import { useState } from "react";
import { Plus, Search, Eye, Edit, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockOrcamentos = [
  {
    id: "ORC-2026-001",
    titulo: "Pavimentação Av. Central",
    cliente: "Prefeitura Municipal de Goiânia",
    dataCreacao: "15/03/2026",
    valorTotal: 1250000,
    status: "Em andamento",
    responsavel: "Carlos Silva",
  },
  {
    id: "ORC-2026-002",
    titulo: "Terraplanagem Lote Industrial 14",
    cliente: "Construtora ABC Ltda",
    dataCreacao: "22/03/2026",
    valorTotal: 890000,
    status: "Revisão",
    responsavel: "Ana Souza",
  },
  {
    id: "ORC-2026-003",
    titulo: "Sondagem BR-101 km 42-58",
    cliente: "DNIT",
    dataCreacao: "01/03/2026",
    valorTotal: 2100000,
    status: "Finalizado",
    responsavel: "Roberto Lima",
  },
  {
    id: "ORC-2026-004",
    titulo: "Drenagem Pluvial - Setor Norte",
    cliente: "SANEAGO",
    dataCreacao: "28/03/2026",
    valorTotal: 3450000,
    status: "Rascunho",
    responsavel: "Carlos Silva",
  },
];

const statusColor: Record<string, string> = {
  "Em andamento": "bg-info/10 text-info",
  Revisão: "bg-warning/10 text-warning",
  Finalizado: "bg-success/10 text-success",
  Rascunho: "bg-muted text-muted-foreground",
};

export default function Orcamentos() {
  const [search, setSearch] = useState("");
  const filtered = mockOrcamentos.filter(
    (o) =>
      o.titulo.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Gerenciamento de orçamentos técnicos</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar orçamento ou cliente..."
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
                <th>Título</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Responsável</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="font-medium text-accent">{o.id}</td>
                  <td className="font-medium">{o.titulo}</td>
                  <td>{o.cliente}</td>
                  <td>{o.dataCreacao}</td>
                  <td>{o.responsavel}</td>
                  <td className="font-semibold">
                    R$ {o.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[o.status] || ""}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
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

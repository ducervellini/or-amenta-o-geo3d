import { DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const dreData = [
  { label: "Receita Bruta", value: 1250000, level: 0 },
  { label: "(-) Impostos sobre Receita", value: -83125, level: 1 },
  { label: "PIS (0,65%)", value: -8125, level: 2 },
  { label: "COFINS (3,00%)", value: -37500, level: 2 },
  { label: "ISS (3,00%)", value: -37500, level: 2 },
  { label: "(=) Receita Líquida", value: 1166875, level: 0, highlight: true },
  { label: "(-) Custos Diretos", value: -850000, level: 1 },
  { label: "Mão de Obra", value: -380000, level: 2 },
  { label: "Equipamentos", value: -220000, level: 2 },
  { label: "Materiais", value: -180000, level: 2 },
  { label: "Veículos", value: -70000, level: 2 },
  { label: "(=) Lucro Bruto", value: 316875, level: 0, highlight: true },
  { label: "(-) Despesas Operacionais", value: -175000, level: 1 },
  { label: "Administração Central", value: -50000, level: 2 },
  { label: "Administração Local", value: -85000, level: 2 },
  { label: "Despesas Financeiras", value: -15375, level: 2 },
  { label: "Seguros e Garantias", value: -10000, level: 2 },
  { label: "Risco", value: -14625, level: 2 },
  { label: "(=) Lucro Operacional (EBIT)", value: 141875, level: 0, highlight: true },
  { label: "(=) Lucro Líquido", value: 141875, level: 0, accent: true },
];

export default function DRE() {
  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Formação de Preço por DRE</h1>
          <p className="page-subtitle">
            Demonstrativo de Resultado do Exercício — visão analítica
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Info className="w-4 h-4" />
          Como funciona
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border shadow-sm">
          <div className="p-5 border-b flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">DRE do Orçamento</h2>
            <span className="ml-auto text-sm text-muted-foreground">ORC-2026-001</span>
          </div>
          <div className="p-5">
            {dreData.map((row, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between py-2.5 px-3 rounded-md ${
                  row.highlight
                    ? "bg-muted font-semibold"
                    : row.accent
                    ? "bg-accent/10 font-bold text-accent"
                    : ""
                }`}
                style={{ paddingLeft: `${row.level * 24 + 12}px` }}
              >
                <span
                  className={`text-sm ${
                    row.level === 2 ? "text-muted-foreground" : ""
                  }`}
                >
                  {row.label}
                </span>
                <span
                  className={`text-sm font-mono ${
                    row.value < 0 ? "text-destructive" : ""
                  } ${row.accent ? "text-accent" : ""}`}
                >
                  R$ {Math.abs(row.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  {row.value < 0 ? " (-)" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg border shadow-sm p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Margem Líquida</p>
            <p className="text-4xl font-bold text-accent">11,35%</p>
            <p className="text-xs text-muted-foreground mt-2">
              R$ 141.875,00 / R$ 1.250.000,00
            </p>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-5">
            <h3 className="text-sm font-semibold mb-3">Indicadores</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem Bruta</span>
                <span className="font-medium">25,35%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem EBIT</span>
                <span className="font-medium">11,35%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Direto / Receita</span>
                <span className="font-medium">68,00%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carga Tributária</span>
                <span className="font-medium">6,65%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

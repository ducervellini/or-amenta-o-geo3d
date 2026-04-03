import { useState } from "react";
import { Calculator, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BDIItem {
  label: string;
  sigla: string;
  percentual: number;
  descricao: string;
}

const defaultBDI: BDIItem[] = [
  { label: "Administração Central", sigla: "AC", percentual: 4.00, descricao: "Custos indiretos da sede" },
  { label: "Seguro e Garantia", sigla: "S+G", percentual: 0.80, descricao: "Seguros e garantias contratuais" },
  { label: "Risco", sigla: "R", percentual: 1.27, descricao: "Margem de risco do empreendimento" },
  { label: "Despesas Financeiras", sigla: "DF", percentual: 1.23, descricao: "Custo financeiro do capital" },
  { label: "Lucro", sigla: "L", percentual: 7.40, descricao: "Margem de lucro bruto" },
  { label: "PIS", sigla: "PIS", percentual: 0.65, descricao: "Programa de Integração Social" },
  { label: "COFINS", sigla: "COFINS", percentual: 3.00, descricao: "Contrib. p/ Financiamento da Seg. Social" },
  { label: "ISS", sigla: "ISS", percentual: 3.00, descricao: "Imposto Sobre Serviços" },
  { label: "CPRB", sigla: "CPRB", percentual: 0.00, descricao: "Contribuição Previdenciária s/ Receita Bruta" },
];

export default function BDI() {
  const [items, setItems] = useState<BDIItem[]>(defaultBDI);

  const handleChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], percentual: parseFloat(value) || 0 };
    setItems(updated);
  };

  // BDI formula: ((1+AC+S+R+G) * (1+DF) * (1+L)) / (1 - I) - 1
  const ac = items.find((i) => i.sigla === "AC")?.percentual || 0;
  const sg = items.find((i) => i.sigla === "S+G")?.percentual || 0;
  const r = items.find((i) => i.sigla === "R")?.percentual || 0;
  const df = items.find((i) => i.sigla === "DF")?.percentual || 0;
  const l = items.find((i) => i.sigla === "L")?.percentual || 0;
  const tributos = items
    .filter((i) => ["PIS", "COFINS", "ISS", "CPRB"].includes(i.sigla))
    .reduce((sum, i) => sum + i.percentual, 0);

  const bdiCalc =
    ((1 + (ac + sg + r) / 100) * (1 + df / 100) * (1 + l / 100)) /
      (1 - tributos / 100) -
    1;
  const bdiPercent = bdiCalc * 100;

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Cálculo de BDI</h1>
          <p className="page-subtitle">
            Bonificação e Despesas Indiretas — formação de preço
          </p>
        </div>
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          Salvar Configuração
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input table */}
        <div className="lg:col-span-2 bg-card rounded-lg border shadow-sm">
          <div className="p-5 border-b flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Componentes do BDI</h2>
          </div>
          <div className="p-5 space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.sigla}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
              >
                <div className="w-16 text-center">
                  <span className="text-xs font-bold text-accent uppercase">
                    {item.sigla}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.descricao}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.percentual}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="w-24 px-3 py-2 text-sm text-right bg-background border rounded-md focus:ring-2 focus:ring-ring outline-none"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border shadow-sm p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">BDI Calculado</p>
            <p className="text-4xl font-bold text-accent">
              {bdiPercent.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Fator multiplicador: {(1 + bdiCalc).toFixed(4)}
            </p>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-info" />
              <h3 className="text-sm font-semibold">Fórmula</h3>
            </div>
            <div className="bg-muted rounded-md p-3 text-xs font-mono text-muted-foreground leading-relaxed">
              BDI = [(1+AC+S+R+G) × (1+DF) × (1+L)] / (1-I) - 1
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>AC = Administração Central</p>
              <p>S+G = Seguros e Garantias</p>
              <p>R = Risco</p>
              <p>DF = Despesas Financeiras</p>
              <p>L = Lucro</p>
              <p>I = Impostos (PIS+COFINS+ISS+CPRB)</p>
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-5">
            <h3 className="text-sm font-semibold mb-3">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custos Indiretos</span>
                <span className="font-medium">{(ac + sg + r).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desp. Financeiras</span>
                <span className="font-medium">{df.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro</span>
                <span className="font-medium">{l.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tributos</span>
                <span className="font-medium">{tributos.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>BDI Total</span>
                <span className="text-accent">{bdiPercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

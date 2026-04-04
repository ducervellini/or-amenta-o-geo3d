import { type ResumoComposicao as Resumo } from "@/lib/composicao-calculo";
import { Users, Wrench, Package } from "lucide-react";

interface Props {
  resumo: Resumo;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function ResumoComposicao({ resumo }: Props) {
  const itens = [
    { label: "Mão de Obra", valor: resumo.mao_de_obra, icon: Users, cor: "text-blue-400" },
    { label: "Equipamentos", valor: resumo.equipamentos, icon: Wrench, cor: "text-amber-400" },
    { label: "Materiais", valor: resumo.materiais, icon: Package, cor: "text-purple-400" },
  ];

  return (
    <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Resumo de Custos Diretos
      </h3>
      <div className="space-y-3">
        {itens.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <item.icon className={`w-4 h-4 ${item.cor}`} />
              <span className="text-sm">{item.label}</span>
            </div>
            <span className="font-mono text-sm font-medium">R$ {fmt(item.valor)}</span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="font-semibold text-sm">Custo Direto Total</span>
        <span className="font-mono font-bold text-lg text-primary">R$ {fmt(resumo.custo_direto)}</span>
      </div>
      {resumo.custo_direto > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-2">
          {itens.map((item) => {
            const pct = resumo.custo_direto > 0 ? (item.valor / resumo.custo_direto) * 100 : 0;
            return (
              <div key={item.label} className="text-center">
                <div className="text-xs text-muted-foreground">{item.label.split(" ")[0]}</div>
                <div className="text-sm font-semibold">{pct.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

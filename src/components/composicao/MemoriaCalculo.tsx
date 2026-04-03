import { type MemoriaCalculo as MemoriaItem } from "@/lib/composicao-calculo";
import { Calculator } from "lucide-react";

interface Props {
  memoria: MemoriaItem[];
  titulo?: string;
}

export function MemoriaCalculo({ memoria, titulo = "Memória de Cálculo" }: Props) {
  if (!memoria.length) return null;

  return (
    <div className="bg-muted/50 rounded-lg border p-4 space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Calculator className="w-3.5 h-3.5" />
        {titulo}
      </h4>
      <div className="space-y-1">
        {memoria.map((m, i) => (
          <div key={i} className="flex items-baseline justify-between text-xs gap-4">
            <span className="text-muted-foreground shrink-0">{m.descricao}</span>
            <span className="border-b border-dotted border-muted-foreground/30 flex-1 min-w-4" />
            <span className="font-mono text-foreground shrink-0">{m.formula}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-border flex justify-between items-center">
        <span className="text-xs font-semibold">Resultado</span>
        <span className="font-mono font-bold text-sm text-primary">
          R$ {memoria[memoria.length - 1]?.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

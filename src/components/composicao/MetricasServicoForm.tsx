import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMetricasPorGeometria } from "@/lib/metricas-servico";
import { MapPin, Ruler, Mountain } from "lucide-react";

interface Props {
  tipoGeometria: string;
  metricas: Record<string, unknown>;
  onChange: (metricas: Record<string, unknown>) => void;
}

const iconMap: Record<string, React.ElementType> = {
  area: Mountain, linha: Ruler, ponto: MapPin,
};

export function MetricasServicoForm({ tipoGeometria, metricas, onChange }: Props) {
  const campos = getMetricasPorGeometria(tipoGeometria);
  const Icon = iconMap[tipoGeometria] || MapPin;

  if (!campos.length) return null;

  const set = (key: string, value: unknown) => {
    onChange({ ...metricas, [key]: value });
  };

  const tipoLabel: Record<string, string> = { area: "Área", linha: "Linha", ponto: "Ponto", hibrido: "Híbrido" };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Icon className="w-4 h-4" />
        Métricas Técnicas — {tipoLabel[tipoGeometria] || tipoGeometria}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {campos.map((campo) => (
          <div key={campo.key} className="space-y-1.5">
            <Label className="text-xs">{campo.label}</Label>
            {campo.type === "select" ? (
              <Select
                value={String(metricas[campo.key] || campo.options?.[0]?.value || "")}
                onValueChange={(v) => set(campo.key, v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {campo.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="number"
                step="0.01"
                className="h-8 text-xs"
                value={Number(metricas[campo.key]) || 0}
                onChange={(e) => set(campo.key, parseFloat(e.target.value) || 0)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

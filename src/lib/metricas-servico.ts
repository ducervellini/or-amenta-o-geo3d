/**
 * Definição de métricas técnicas por tipo de geometria de serviço
 */

export interface MetricaArea {
  hectares: number;
  num_imoveis: number;
  num_vertices: number;
  num_confrontantes: number;
  percentual_vegetacao: number;
  percentual_area_aberta: number;
  relevo: "plano" | "ondulado" | "montanhoso" | "escarpado";
}

export interface MetricaLinha {
  km_totais: number;
  km_produtivos: number;
  num_travessias: number;
  num_estruturas: number;
  acessos_criticos: number;
  municipios_cruzados: number;
}

export interface MetricaPonto {
  num_pontos: number;
  tempo_medio_minutos: number;
  distancia_media_km: number;
  revisitas: number;
}

export type MetricasServico = MetricaArea | MetricaLinha | MetricaPonto;

export function getDefaultMetricaArea(): MetricaArea {
  return {
    hectares: 0, num_imoveis: 0, num_vertices: 0, num_confrontantes: 0,
    percentual_vegetacao: 0, percentual_area_aberta: 100, relevo: "plano",
  };
}

export function getDefaultMetricaLinha(): MetricaLinha {
  return {
    km_totais: 0, km_produtivos: 0, num_travessias: 0,
    num_estruturas: 0, acessos_criticos: 0, municipios_cruzados: 0,
  };
}

export function getDefaultMetricaPonto(): MetricaPonto {
  return {
    num_pontos: 0, tempo_medio_minutos: 30, distancia_media_km: 5, revisitas: 0,
  };
}

export function getMetricasPorGeometria(tipo: string): { label: string; key: string; type: "number" | "select"; options?: { label: string; value: string }[] }[] {
  switch (tipo) {
    case "area":
      return [
        { label: "Hectares", key: "hectares", type: "number" },
        { label: "Nº de Imóveis", key: "num_imoveis", type: "number" },
        { label: "Nº de Vértices", key: "num_vertices", type: "number" },
        { label: "Nº de Confrontantes", key: "num_confrontantes", type: "number" },
        { label: "% Vegetação", key: "percentual_vegetacao", type: "number" },
        { label: "% Área Aberta", key: "percentual_area_aberta", type: "number" },
        { label: "Relevo", key: "relevo", type: "select", options: [
          { label: "Plano", value: "plano" },
          { label: "Ondulado", value: "ondulado" },
          { label: "Montanhoso", value: "montanhoso" },
          { label: "Escarpado", value: "escarpado" },
        ]},
      ];
    case "linha":
      return [
        { label: "Km Totais", key: "km_totais", type: "number" },
        { label: "Km Produtivos", key: "km_produtivos", type: "number" },
        { label: "Nº de Travessias", key: "num_travessias", type: "number" },
        { label: "Nº de Estruturas", key: "num_estruturas", type: "number" },
        { label: "Acessos Críticos", key: "acessos_criticos", type: "number" },
        { label: "Municípios Cruzados", key: "municipios_cruzados", type: "number" },
      ];
    case "ponto":
      return [
        { label: "Nº de Pontos", key: "num_pontos", type: "number" },
        { label: "Tempo Médio por Ponto (min)", key: "tempo_medio_minutos", type: "number" },
        { label: "Distância Média entre Pontos (km)", key: "distancia_media_km", type: "number" },
        { label: "Revisitas", key: "revisitas", type: "number" },
      ];
    default:
      return [];
  }
}

// Calculate quantity from metrics
export function calcularQuantidadeDeMetricas(tipo: string, metricas: Record<string, unknown>): number {
  switch (tipo) {
    case "area": return Number(metricas.hectares) || 0;
    case "linha": return Number(metricas.km_totais) || 0;
    case "ponto": return Number(metricas.num_pontos) || 0;
    default: return 0;
  }
}

// Estimate days from metrics and productivity
export function estimarPrazoDias(
  tipo: string,
  metricas: Record<string, unknown>,
  produtividadePorDia: number,
  numEquipes: number
): number {
  const quantidade = calcularQuantidadeDeMetricas(tipo, metricas);
  if (produtividadePorDia <= 0 || numEquipes <= 0) return 0;
  let diasBase = Math.ceil(quantidade / (produtividadePorDia * numEquipes));
  
  // Adjustment factors
  if (tipo === "area") {
    const relevo = String(metricas.relevo || "plano");
    const fatorRelevo: Record<string, number> = { plano: 1, ondulado: 1.2, montanhoso: 1.5, escarpado: 2 };
    const fatorVegetacao = 1 + (Number(metricas.percentual_vegetacao) || 0) / 200;
    diasBase = Math.ceil(diasBase * (fatorRelevo[relevo] || 1) * fatorVegetacao);
  } else if (tipo === "ponto") {
    const revisitas = Number(metricas.revisitas) || 0;
    diasBase = Math.ceil(diasBase * (1 + revisitas * 0.1));
  }
  
  return diasBase;
}

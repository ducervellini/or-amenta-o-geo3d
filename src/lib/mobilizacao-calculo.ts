/**
 * Motor de cálculo de Mobilização e Administração Local
 * Calcula custos de deslocamento, hospedagem, alimentação,
 * combustível, veículos, pedágios e viagens avulsas.
 */

export interface MobilizacaoParams {
  dias_trabalho: number;
  jornada_diaria: number;
  dias_chuva_mes: number;
  fator_improdutividade: number;
  distancia_base_projeto: number;
  distancia_media_diaria: number;
}

export interface CustoItem {
  categoria: string;
  descricao?: string;
  valor_unitario: number;
  quantidade: number;
  frequencia: string; // diario, viagem, mensal, unico
  consumo_km?: number;
  preco_litro?: number;
  tipo_propriedade?: string;
  valor_aluguel?: number;
}

export interface EquipeItem {
  nome: string;
  quantidade_pessoas: number;
  custo_deslocamento: number;
  custo_hospedagem: number;
  custo_alimentacao: number;
}

export interface ResultadoMobilizacao {
  dias_produtivos: number;
  dias_improdutivos: number;
  custos_por_categoria: Record<string, number>;
  custo_total: number;
  custo_por_dia: number;
  custo_por_equipe: number;
  total_equipes: number;
}

export function calcularDiasProdutivos(params: MobilizacaoParams) {
  const diasImprodutivos = Math.round(params.dias_trabalho * params.fator_improdutividade);
  const diasProdutivos = params.dias_trabalho - diasImprodutivos;
  return { diasProdutivos: Math.max(0, diasProdutivos), diasImprodutivos };
}

export function calcularCustoItem(
  item: CustoItem,
  diasProdutivos: number,
  distanciaBaseKm: number,
  distanciaMediaDiaria: number
): number {
  switch (item.categoria) {
    case "combustivel": {
      const consumo = item.consumo_km || 0;
      const preco = item.preco_litro || item.valor_unitario;
      // Ida e volta diária + deslocamento médio
      const kmTotal = (distanciaBaseKm * 2) + (distanciaMediaDiaria * diasProdutivos);
      return consumo > 0 ? (kmTotal / consumo) * preco : 0;
    }
    case "pedagio": {
      // Pedágio por viagem (ida + volta = 2x)
      return item.valor_unitario * item.quantidade * 2;
    }
    case "viagem_avulsa": {
      return item.valor_unitario * item.quantidade;
    }
    case "veiculo": {
      if (item.tipo_propriedade === "alugado") {
        const aluguel = item.valor_aluguel || item.valor_unitario;
        if (item.frequencia === "diario") return aluguel * diasProdutivos * item.quantidade;
        if (item.frequencia === "mensal") return aluguel * item.quantidade;
        return aluguel * item.quantidade;
      }
      // Próprio: custo/dia × dias
      return item.valor_unitario * diasProdutivos * item.quantidade;
    }
    case "hospedagem":
    case "alimentacao":
    default: {
      if (item.frequencia === "diario") {
        return item.valor_unitario * item.quantidade * diasProdutivos;
      }
      if (item.frequencia === "mensal") {
        return item.valor_unitario * item.quantidade;
      }
      // unico
      return item.valor_unitario * item.quantidade;
    }
  }
}

export function calcularMobilizacao(
  params: MobilizacaoParams,
  custos: CustoItem[],
  equipes: EquipeItem[]
): ResultadoMobilizacao {
  const { diasProdutivos, diasImprodutivos } = calcularDiasProdutivos(params);

  const custosPorCategoria: Record<string, number> = {};
  let custoTotal = 0;

  for (const item of custos) {
    const valor = calcularCustoItem(
      item,
      diasProdutivos,
      params.distancia_base_projeto,
      params.distancia_media_diaria
    );
    custosPorCategoria[item.categoria] = (custosPorCategoria[item.categoria] || 0) + valor;
    custoTotal += valor;
  }

  // Custos de equipe
  let custoEquipes = 0;
  for (const eq of equipes) {
    const custoEq =
      (eq.custo_deslocamento + eq.custo_hospedagem + eq.custo_alimentacao) *
      eq.quantidade_pessoas *
      diasProdutivos;
    custoEquipes += custoEq;
  }
  custosPorCategoria["equipes"] = custoEquipes;
  custoTotal += custoEquipes;

  const totalEquipes = equipes.reduce((s, e) => s + e.quantidade_pessoas, 0);

  return {
    dias_produtivos: diasProdutivos,
    dias_improdutivos: diasImprodutivos,
    custos_por_categoria: custosPorCategoria,
    custo_total: custoTotal,
    custo_por_dia: diasProdutivos > 0 ? custoTotal / diasProdutivos : 0,
    custo_por_equipe: totalEquipes > 0 ? custoTotal / totalEquipes : 0,
    total_equipes: totalEquipes,
  };
}

/** Categorias disponíveis */
export const CATEGORIAS_CUSTO = [
  { value: "hospedagem", label: "Hospedagem" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "combustivel", label: "Combustível" },
  { value: "veiculo", label: "Veículo" },
  { value: "pedagio", label: "Pedágio" },
  { value: "viagem_avulsa", label: "Viagem Avulsa" },
] as const;

export const FREQUENCIAS = [
  { value: "diario", label: "Diário" },
  { value: "viagem", label: "Por Viagem" },
  { value: "mensal", label: "Mensal" },
  { value: "unico", label: "Único" },
] as const;

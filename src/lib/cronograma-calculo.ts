/**
 * Motor de cálculo do Cronograma do orçamento.
 *
 * Modelo:
 *  - Para cada serviço do orçamento, derivamos a duração em dias úteis a partir
 *    de produtividade × quantidade × número de equipes.
 *  - O campo×escritório acontece **em paralelo** dentro do mesmo prazo de cada
 *    serviço (mesma duração calendária).
 *  - A ordem default é sequencial (cada serviço começa quando o anterior termina).
 *    O usuário pode sobrescrever a data_inicio de qualquer item para "quebrar"
 *    a sequência.
 *  - `fator_improdutividade` (da Mobilização) infla os dias úteis para dias corridos.
 */

import { safeNumber } from "@/lib/utils";

export interface CronogramaServicoInput {
  composicaoId: string;
  composicaoCodigo: string;
  composicaoNome: string;
  unidade: string;
  quantidade: number;
  /** produtividade padrão do serviço (qtd por unidade de tempo) */
  produtividadePadrao: number | null;
  /** "hora" | "dia" | "semana" | "mes" */
  unidadeTempoProdutividade: string;
  /** Para o split campo/escritório — soma de horas de cada lado nesta composição */
  horasCampo: number;
  horasEscritorio: number;
  /** Override do usuário */
  numEquipes: number;
  dataInicioOverride: string | null;
  ordem: number;
}

export interface CronogramaParams {
  /** Data de início do projeto (mobilização) */
  dataInicioProjeto: string;
  /** Horas de jornada diária */
  jornadaDiaria: number;
  /** Dias úteis por mês (típico 22) */
  diasUteisMes: number;
  /** Fator de improdutividade [0..1], ex: 0.15 = +15% em dias corridos */
  fatorImprodutividade: number;
}

export interface CronogramaItemCalculado {
  composicaoId: string;
  composicaoCodigo: string;
  composicaoNome: string;
  unidade: string;
  quantidade: number;
  numEquipes: number;
  /** Dias úteis brutos derivados de produtividade */
  diasBrutos: number;
  /** Dias corridos (incluindo improdutividade) */
  diasEfetivos: number;
  /** Proporção (0..1) de carga campo vs escritório */
  propCampo: number;
  propEscritorio: number;
  /** Datas calendário (YYYY-MM-DD) */
  dataInicio: string;
  dataFim: string;
  /** Se a data foi sobrescrita pelo usuário */
  inicioOverride: boolean;
  ordem: number;
}

export interface CronogramaResultado {
  itens: CronogramaItemCalculado[];
  /** Data de início do primeiro item */
  inicioGeral: string;
  /** Data de fim do último item */
  fimGeral: string;
  /** Duração total em meses (calendário) */
  duracaoMeses: number;
  /** Duração total em dias corridos */
  duracaoDias: number;
}

/** Converte produtividade para "quantidade por dia útil". */
export function produtividadePorDia(
  prod: number | null,
  unidade: string,
  jornadaDiaria: number,
  diasUteisMes: number,
): number {
  const p = safeNumber(prod, 0);
  if (p <= 0) return 0;
  switch ((unidade || "dia").toLowerCase()) {
    case "hora":
    case "h":
    case "h/h":
      return p * jornadaDiaria;
    case "dia":
    case "d":
      return p;
    case "semana":
      return p / 5;
    case "mes":
    case "mês":
      return p / Math.max(1, diasUteisMes);
    default:
      return p;
  }
}

function addDiasISO(dateStr: string, dias: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + Math.max(0, Math.round(dias)));
  return d.toISOString().split("T")[0];
}

function diffDiasISO(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.max(0, Math.round((db - da) / 86_400_000));
}

export function calcularCronograma(
  inputs: CronogramaServicoInput[],
  params: CronogramaParams,
): CronogramaResultado {
  const ordenados = [...inputs].sort((a, b) => a.ordem - b.ordem);

  const itens: CronogramaItemCalculado[] = [];
  let cursor = params.dataInicioProjeto;

  for (const it of ordenados) {
    const numEquipes = Math.max(1, safeNumber(it.numEquipes, 1));
    const prodDia = produtividadePorDia(
      it.produtividadePadrao,
      it.unidadeTempoProdutividade,
      params.jornadaDiaria,
      params.diasUteisMes,
    );
    const qtd = safeNumber(it.quantidade, 0);
    const diasBrutos = prodDia > 0 ? Math.ceil(qtd / (prodDia * numEquipes)) : 0;
    const diasEfetivos = Math.ceil(diasBrutos * (1 + safeNumber(params.fatorImprodutividade, 0)));

    const totalHoras = safeNumber(it.horasCampo, 0) + safeNumber(it.horasEscritorio, 0);
    const propCampo = totalHoras > 0 ? it.horasCampo / totalHoras : 1;
    const propEscritorio = totalHoras > 0 ? it.horasEscritorio / totalHoras : 0;

    const dataInicio = it.dataInicioOverride || cursor;
    const dataFim = addDiasISO(dataInicio, diasEfetivos);

    itens.push({
      composicaoId: it.composicaoId,
      composicaoCodigo: it.composicaoCodigo,
      composicaoNome: it.composicaoNome,
      unidade: it.unidade,
      quantidade: qtd,
      numEquipes,
      diasBrutos,
      diasEfetivos,
      propCampo,
      propEscritorio,
      dataInicio,
      dataFim,
      inicioOverride: !!it.dataInicioOverride,
      ordem: it.ordem,
    });

    // Avança o cursor para o fim deste item (sequencial)
    cursor = dataFim;
  }

  const inicioGeral = itens[0]?.dataInicio || params.dataInicioProjeto;
  const fimGeral = itens.reduce((max, it) => (it.dataFim > max ? it.dataFim : max), inicioGeral);
  const duracaoDias = diffDiasISO(inicioGeral, fimGeral);
  const duracaoMeses = Math.ceil(duracaoDias / 30);

  return { itens, inicioGeral, fimGeral, duracaoMeses, duracaoDias };
}

/**
 * Calcula o custo total mensal de um cargo considerando:
 * - Encargos sociais (% sobre salário)
 * - Benefícios (fixos ou % sobre salário)
 * - Jornada de trabalho (para conversão hora/diária → mensal)
 * - Regime operacional (fator de dias trabalhados vs ciclo total)
 * - Horário de almoço (reduz horas produtivas efetivas)
 */

export interface Cargo {
  id: string;
  nome: string;
  salario_base: number;
  unidade_salarial: string; // "mensal" | "hora" | "diaria"
  regime_contratacao: string; // "clt" | "pj"
  descricao?: string | null;
}

export interface Encargo {
  nome: string;
  percentual: number;
  grupo: string;
  obrigatorio: boolean;
  ativo: boolean;
}

export interface Beneficio {
  nome: string;
  valor: number;
  tipo: string; // "fixo" | "percentual"
  ativo: boolean;
}

export interface Jornada {
  id: string;
  nome: string;
  horas_diarias: number;
  dias_por_semana: number;
  horas_por_mes: number;
}

export interface Regime {
  id: string;
  nome: string;
  dias_trabalho: number;
  dias_folga: number;
}

export interface HorarioAlmoco {
  id: string;
  nome: string;
  duracao_minutos: number;
}

export interface CustoDetalhado {
  salario_mensal: number;
  total_encargos_pct: number;
  valor_encargos: number;
  valor_beneficios_fixos: number;
  valor_beneficios_pct: number;
  custo_total_mensal: number;
  fator_regime: number;
  horas_produtivas_dia: number;
}

export function calcularSalarioMensal(
  cargo: Cargo,
  jornada: Jornada | null
): number {
  const j = jornada || { horas_diarias: 8, dias_por_semana: 5, horas_por_mes: 176 };

  switch (cargo.unidade_salarial) {
    case "hora":
      return cargo.salario_base * j.horas_por_mes;
    case "diaria":
      return cargo.salario_base * j.dias_por_semana * 4.33; // ~semanas/mês
    case "mensal":
    default:
      return cargo.salario_base;
  }
}

export function calcularCustoDetalhado(
  cargo: Cargo,
  encargos: Encargo[],
  beneficios: Beneficio[],
  jornada: Jornada | null,
  regime: Regime | null,
  horarioAlmoco: HorarioAlmoco | null
): CustoDetalhado {
  const salarioMensal = calcularSalarioMensal(cargo, jornada);
  const j = jornada || { horas_diarias: 8, dias_por_semana: 5, horas_por_mes: 176 };

  // Fator regime operacional — folga é remunerada, então o custo mensal
  // permanece integral. O fator indica a proporção de dias produtivos
  // (útil para calcular custo/dia trabalhado, mas NÃO reduz o custo total).
  const fatorRegime = regime
    ? regime.dias_trabalho / (regime.dias_trabalho + regime.dias_folga)
    : 1;

  // Horas produtivas considerando almoço
  const horasAlmoco = horarioAlmoco ? horarioAlmoco.duracao_minutos / 60 : 0;
  const horasProdDia = j.horas_diarias - horasAlmoco;

  const isPJ = cargo.regime_contratacao === "pj";

  // Encargos sociais (apenas CLT)
  const encargosAtivos = isPJ ? [] : encargos.filter((e) => e.ativo);
  const totalEncargosPct = encargosAtivos.reduce((sum, e) => sum + e.percentual, 0);
  const valorEncargos = salarioMensal * (totalEncargosPct / 100);

  // Benefícios (apenas CLT)
  const beneficiosAtivos = isPJ ? [] : beneficios.filter((b) => b.ativo);
  const valorBenFixos = beneficiosAtivos
    .filter((b) => b.tipo === "fixo")
    .reduce((sum, b) => sum + b.valor, 0);
  const valorBenPct = beneficiosAtivos
    .filter((b) => b.tipo === "percentual")
    .reduce((sum, b) => sum + salarioMensal * (b.valor / 100), 0);

  // Custo efetivo mensal: folga remunerada eleva o custo por mês trabalhado
  // Divide pelo fator regime para refletir que dias de folga são pagos
  const custoBase = salarioMensal + valorEncargos + valorBenFixos + valorBenPct;
  const custoTotal = fatorRegime < 1 ? custoBase / fatorRegime : custoBase;

  return {
    salario_mensal: salarioMensal,
    total_encargos_pct: totalEncargosPct,
    valor_encargos: valorEncargos,
    valor_beneficios_fixos: valorBenFixos,
    valor_beneficios_pct: valorBenPct,
    custo_total_mensal: custoTotal,
    fator_regime: fatorRegime,
    horas_produtivas_dia: horasProdDia,
  };
}

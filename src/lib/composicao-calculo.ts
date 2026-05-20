/**
 * Motor de cálculo de composição de custos
 * Fase 1: Custos diretos (mão de obra, equipamentos, materiais)
 */
import { aplicarFatorUtilizacao } from "@/lib/calculos-v2";
import type { MetodologiaCalculoVersao } from "@/types/calculo-v2";

export interface ParametrosMaoDeObra {
  salario_base: number;
  regime_contratacao: "clt" | "pj";
  encargos_percentual: number;
  beneficios_valor: number;
  horas_mes: number;
  dias_mes: number;
  regime_dias_trabalho: number;
  regime_dias_folga: number;
  horas_diarias: number;
  almoco_minutos: number;
}

export interface ParametrosEquipamento {
  valor_aquisicao: number;
  valor_residual: number;
  vida_util_horas: number;
  depreciacao_hora: number;
  manutencao_hora: number;
  combustivel_consumo_hora: number;
  combustivel_preco_litro: number;
  custo_km: number;
  fator_utilizacao: number;
  operador_custo_hora: number;
}

export interface ParametrosVeiculo {
  valor_aquisicao: number;
  valor_residual: number;
  vida_util_km: number;
  depreciacao_km: number;
  manutencao_km: number;
  combustivel_consumo_km: number;
  combustivel_preco_litro: number;
  custo_hora: number;
  fator_utilizacao: number;
  operador_custo_hora: number;
}

export interface ParametrosMaterial {
  custo_unitario: number;
  perda_percentual: number;
  reaproveitamento_percentual: number;
  vida_util_estimada: number;
  custo_reposicao: number;
}

export interface MemoriaCalculo {
  descricao: string;
  formula: string;
  valor: number;
}

export interface ResultadoCalculo {
  custo_unitario: number;
  custo_total: number;
  memoria: MemoriaCalculo[];
}

// ===== MÃO DE OBRA =====
export function calcularMaoDeObra(
  params: ParametrosMaoDeObra,
  quantidade: number,
  coeficiente: number
): ResultadoCalculo {
  const memoria: MemoriaCalculo[] = [];

  const isPJ = params.regime_contratacao === "pj";
  const salarioMensal = params.salario_base;
  memoria.push({ descricao: `Salário base mensal (${isPJ ? "PJ" : "CLT"})`, formula: `R$ ${fmt(salarioMensal)}`, valor: salarioMensal });

  const encargosValor = isPJ ? 0 : salarioMensal * (params.encargos_percentual / 100);
  if (isPJ) {
    memoria.push({ descricao: "Encargos sociais (PJ: isento)", formula: "R$ 0,00", valor: 0 });
  } else {
    memoria.push({ descricao: "Encargos sociais", formula: `${fmt(salarioMensal)} × ${fmt(params.encargos_percentual)}% = ${fmt(encargosValor)}`, valor: encargosValor });
  }

  const beneficiosValor = isPJ ? 0 : params.beneficios_valor;
  const custoMensalTotal = salarioMensal + encargosValor + beneficiosValor;
  if (isPJ) {
    memoria.push({ descricao: "Custo mensal total (PJ: sem benefícios)", formula: `R$ ${fmt(custoMensalTotal)}`, valor: custoMensalTotal });
  } else {
    memoria.push({ descricao: "Custo mensal total", formula: `${fmt(salarioMensal)} + ${fmt(encargosValor)} + ${fmt(beneficiosValor)} = ${fmt(custoMensalTotal)}`, valor: custoMensalTotal });
  }

  const horasUteisMes = params.horas_mes > 0 ? params.horas_mes : (params.horas_diarias * params.dias_mes);
  const custoHora = horasUteisMes > 0 ? custoMensalTotal / horasUteisMes : 0;
  memoria.push({ descricao: "Horas úteis/mês", formula: `${fmt(horasUteisMes)} h`, valor: horasUteisMes });
  memoria.push({ descricao: "Custo por hora", formula: `${fmt(custoMensalTotal)} / ${fmt(horasUteisMes)} = ${fmt(custoHora)}`, valor: custoHora });

  const custoDia = custoHora * params.horas_diarias;
  memoria.push({ descricao: "Custo por dia", formula: `${fmt(custoHora)} × ${fmt(params.horas_diarias)} h = ${fmt(custoDia)}`, valor: custoDia });

  // Fator regime operacional
  let fatorRegime = 1;
  if (params.regime_dias_trabalho > 0 && params.regime_dias_folga > 0) {
    fatorRegime = (params.regime_dias_trabalho + params.regime_dias_folga) / params.regime_dias_trabalho;
    memoria.push({ descricao: "Fator regime operacional", formula: `(${params.regime_dias_trabalho} + ${params.regime_dias_folga}) / ${params.regime_dias_trabalho} = ${fmt(fatorRegime)}`, valor: fatorRegime });
  }

  const custoHoraFinal = custoHora * fatorRegime;
  memoria.push({ descricao: "Custo hora c/ regime", formula: `${fmt(custoHora)} × ${fmt(fatorRegime)} = ${fmt(custoHoraFinal)}`, valor: custoHoraFinal });

  const custoUnitario = custoHoraFinal * coeficiente;
  memoria.push({ descricao: "Custo unitário (1 unidade)", formula: `H/H ${fmt(custoHoraFinal)} × ${fmt(coeficiente)} h/un = ${fmt(custoUnitario)}`, valor: custoUnitario });

  const custoTotal = custoUnitario * quantidade;
  memoria.push({ descricao: "Custo total", formula: `${fmt(custoUnitario)} × ${fmt(quantidade)} un = ${fmt(custoTotal)}`, valor: custoTotal });

  return { custo_unitario: custoUnitario, custo_total: custoTotal, memoria };
}

// ===== EQUIPAMENTO =====
export function calcularEquipamento(
  params: ParametrosEquipamento,
  quantidade: number,
  coeficiente: number,
  metodologia: MetodologiaCalculoVersao = "v1_legado",
): ResultadoCalculo {
  const memoria: MemoriaCalculo[] = [];

  let depHora = params.depreciacao_hora;
  if (!depHora && params.valor_aquisicao > 0 && params.vida_util_horas > 0) {
    depHora = (params.valor_aquisicao - params.valor_residual) / params.vida_util_horas;
    memoria.push({ descricao: "Depreciação/hora", formula: `(${fmt(params.valor_aquisicao)} - ${fmt(params.valor_residual)}) / ${fmt(params.vida_util_horas)} = ${fmt(depHora)}`, valor: depHora });
  } else {
    memoria.push({ descricao: "Depreciação/hora", formula: `R$ ${fmt(depHora)}`, valor: depHora });
  }

  memoria.push({ descricao: "Manutenção/hora", formula: `R$ ${fmt(params.manutencao_hora)}`, valor: params.manutencao_hora });

  const custoCombustivelHora = params.combustivel_consumo_hora * params.combustivel_preco_litro;
  memoria.push({ descricao: "Combustível/hora", formula: `${fmt(params.combustivel_consumo_hora)} L × R$ ${fmt(params.combustivel_preco_litro)} = ${fmt(custoCombustivelHora)}`, valor: custoCombustivelHora });

  memoria.push({ descricao: "Operador/hora", formula: `R$ ${fmt(params.operador_custo_hora)}`, valor: params.operador_custo_hora });

  const custoHoraProdutiva = depHora + params.manutencao_hora + custoCombustivelHora + params.operador_custo_hora;
  memoria.push({ descricao: "Custo hora produtiva", formula: `${fmt(depHora)} + ${fmt(params.manutencao_hora)} + ${fmt(custoCombustivelHora)} + ${fmt(params.operador_custo_hora)} = ${fmt(custoHoraProdutiva)}`, valor: custoHoraProdutiva });

  const custoHoraComFator = aplicarFatorUtilizacao(custoHoraProdutiva, params.fator_utilizacao, metodologia);
  const opLabel = metodologia === "v2_corrigido" ? "÷" : "×";
  memoria.push({ descricao: `Custo hora c/ fator utilização (${metodologia})`, formula: `${fmt(custoHoraProdutiva)} ${opLabel} ${fmt(params.fator_utilizacao)} = ${fmt(custoHoraComFator)}`, valor: custoHoraComFator });

  const custoUnitario = custoHoraComFator * coeficiente;
  memoria.push({ descricao: "Custo unitário", formula: `${fmt(custoHoraComFator)} × ${fmt(coeficiente)} = ${fmt(custoUnitario)}`, valor: custoUnitario });

  const custoTotal = custoUnitario * quantidade;
  memoria.push({ descricao: "Custo total", formula: `${fmt(custoUnitario)} × ${fmt(quantidade)} = ${fmt(custoTotal)}`, valor: custoTotal });

  return { custo_unitario: custoUnitario, custo_total: custoTotal, memoria };
}

// ===== VEÍCULO =====
export function calcularVeiculo(
  params: ParametrosVeiculo,
  quantidade: number,
  coeficiente: number,
  metodologia: MetodologiaCalculoVersao = "v1_legado",
): ResultadoCalculo {
  const memoria: MemoriaCalculo[] = [];

  let depKm = params.depreciacao_km;
  if (!depKm && params.valor_aquisicao > 0 && params.vida_util_km > 0) {
    depKm = (params.valor_aquisicao - params.valor_residual) / params.vida_util_km;
    memoria.push({ descricao: "Depreciação/km", formula: `(${fmt(params.valor_aquisicao)} - ${fmt(params.valor_residual)}) / ${fmt(params.vida_util_km)} = ${fmt(depKm)}`, valor: depKm });
  } else {
    memoria.push({ descricao: "Depreciação/km", formula: `R$ ${fmt(depKm)}`, valor: depKm });
  }

  memoria.push({ descricao: "Manutenção/km", formula: `R$ ${fmt(params.manutencao_km)}`, valor: params.manutencao_km });

  const custoCombustivelKm = params.combustivel_consumo_km * params.combustivel_preco_litro;
  memoria.push({ descricao: "Combustível/km", formula: `${fmt(params.combustivel_consumo_km)} L × R$ ${fmt(params.combustivel_preco_litro)} = ${fmt(custoCombustivelKm)}`, valor: custoCombustivelKm });

  const custoKm = depKm + params.manutencao_km + custoCombustivelKm;
  memoria.push({ descricao: "Custo por km", formula: `${fmt(depKm)} + ${fmt(params.manutencao_km)} + ${fmt(custoCombustivelKm)} = ${fmt(custoKm)}`, valor: custoKm });

  const custoHoraTotal = params.custo_hora + params.operador_custo_hora;
  memoria.push({ descricao: "Custo hora (veículo + operador)", formula: `${fmt(params.custo_hora)} + ${fmt(params.operador_custo_hora)} = ${fmt(custoHoraTotal)}`, valor: custoHoraTotal });

  const custoComFator = custoHoraTotal * params.fator_utilizacao;
  memoria.push({ descricao: "Custo hora c/ fator utilização", formula: `${fmt(custoHoraTotal)} × ${fmt(params.fator_utilizacao)} = ${fmt(custoComFator)}`, valor: custoComFator });

  const custoUnitario = custoComFator * coeficiente;
  memoria.push({ descricao: "Custo unitário", formula: `${fmt(custoComFator)} × ${fmt(coeficiente)} = ${fmt(custoUnitario)}`, valor: custoUnitario });

  const custoTotal = custoUnitario * quantidade;
  memoria.push({ descricao: "Custo total", formula: `${fmt(custoUnitario)} × ${fmt(quantidade)} = ${fmt(custoTotal)}`, valor: custoTotal });

  return { custo_unitario: custoUnitario, custo_total: custoTotal, memoria };
}

// ===== MATERIAL =====
export function calcularMaterial(
  params: ParametrosMaterial,
  quantidade: number,
  coeficiente: number
): ResultadoCalculo {
  const memoria: MemoriaCalculo[] = [];

  memoria.push({ descricao: "Custo unitário base", formula: `R$ ${fmt(params.custo_unitario)}`, valor: params.custo_unitario });

  const fatorPerda = 1 + (params.perda_percentual / 100);
  memoria.push({ descricao: "Fator de perda", formula: `1 + ${fmt(params.perda_percentual)}% = ${fmt(fatorPerda)}`, valor: fatorPerda });

  const fatorReaproveitamento = 1 - (params.reaproveitamento_percentual / 100);
  memoria.push({ descricao: "Fator de reaproveitamento", formula: `1 - ${fmt(params.reaproveitamento_percentual)}% = ${fmt(fatorReaproveitamento)}`, valor: fatorReaproveitamento });

  const custoCorrigido = params.custo_unitario * fatorPerda * fatorReaproveitamento;
  memoria.push({ descricao: "Custo corrigido", formula: `${fmt(params.custo_unitario)} × ${fmt(fatorPerda)} × ${fmt(fatorReaproveitamento)} = ${fmt(custoCorrigido)}`, valor: custoCorrigido });

  let custoReposicao = 0;
  if (params.vida_util_estimada > 0 && params.custo_reposicao > 0) {
    custoReposicao = params.custo_reposicao / params.vida_util_estimada;
    memoria.push({ descricao: "Custo reposição/uso", formula: `${fmt(params.custo_reposicao)} / ${fmt(params.vida_util_estimada)} = ${fmt(custoReposicao)}`, valor: custoReposicao });
  }

  const custoFinal = custoCorrigido + custoReposicao;
  memoria.push({ descricao: "Custo unitário final", formula: `${fmt(custoCorrigido)} + ${fmt(custoReposicao)} = ${fmt(custoFinal)}`, valor: custoFinal });

  const custoUnitario = custoFinal * coeficiente;
  memoria.push({ descricao: "Custo unitário c/ coeficiente", formula: `${fmt(custoFinal)} × ${fmt(coeficiente)} = ${fmt(custoUnitario)}`, valor: custoUnitario });

  const custoTotal = custoUnitario * quantidade;
  memoria.push({ descricao: "Custo total", formula: `${fmt(custoUnitario)} × ${fmt(quantidade)} = ${fmt(custoTotal)}`, valor: custoTotal });

  return { custo_unitario: custoUnitario, custo_total: custoTotal, memoria };
}

// ===== RESUMO DA COMPOSIÇÃO =====
export interface ResumoComposicao {
  mao_de_obra: number;
  equipamentos: number;
  veiculos: number;
  materiais: number;
  custo_direto: number;
}

export function calcularResumo(itens: { tipo_insumo: string; custo_total: number }[]): ResumoComposicao {
  const mao_de_obra = itens.filter(i => i.tipo_insumo === "mao_de_obra").reduce((s, i) => s + i.custo_total, 0);
  const equipamentos = itens.filter(i => i.tipo_insumo === "equipamento").reduce((s, i) => s + i.custo_total, 0);
  const veiculos = itens.filter(i => i.tipo_insumo === "veiculo").reduce((s, i) => s + i.custo_total, 0);
  const materiais = itens.filter(i => i.tipo_insumo === "material" || i.tipo_insumo === "combustivel").reduce((s, i) => s + i.custo_total, 0);
  const custo_direto = mao_de_obra + equipamentos + veiculos + materiais;
  return { mao_de_obra, equipamentos, veiculos, materiais, custo_direto };
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function getDefaultParamsMaoDeObra(): ParametrosMaoDeObra {
  return {
    salario_base: 0, regime_contratacao: "clt", encargos_percentual: 0, beneficios_valor: 0,
    horas_mes: 176, dias_mes: 22,
    regime_dias_trabalho: 0, regime_dias_folga: 0,
    horas_diarias: 8, almoco_minutos: 60,
  };
}

export function getDefaultParamsEquipamento(): ParametrosEquipamento {
  return {
    valor_aquisicao: 0, valor_residual: 0, vida_util_horas: 0,
    depreciacao_hora: 0, manutencao_hora: 0,
    combustivel_consumo_hora: 0, combustivel_preco_litro: 0,
    custo_km: 0, fator_utilizacao: 1, operador_custo_hora: 0,
  };
}

export function getDefaultParamsVeiculo(): ParametrosVeiculo {
  return {
    valor_aquisicao: 0, valor_residual: 0, vida_util_km: 0,
    depreciacao_km: 0, manutencao_km: 0,
    combustivel_consumo_km: 0, combustivel_preco_litro: 0,
    custo_hora: 0, fator_utilizacao: 1, operador_custo_hora: 0,
  };
}

export function getDefaultParamsMaterial(): ParametrosMaterial {
  return {
    custo_unitario: 0, perda_percentual: 0,
    reaproveitamento_percentual: 0, vida_util_estimada: 0, custo_reposicao: 0,
  };
}

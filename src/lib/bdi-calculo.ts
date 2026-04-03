/**
 * Motor de cálculo BDI e custos indiretos
 * Fase 2: Admin local, Admin central, Financiamento, Tributos, Margem
 */

import { type MemoriaCalculo } from "./composicao-calculo";

export interface ParametrosBDI {
  admin_local_percentual: number;
  admin_central_percentual: number;
  financiamento_percentual: number;
  tributos: { nome: string; sigla: string; percentual: number }[];
  margem_percentual: number;
}

export interface ResultadoBDI {
  custo_direto: number;
  admin_local: number;
  admin_central: number;
  custo_indireto: number;
  financiamento: number;
  subtotal_antes_bdi: number;
  tributos_total: number;
  tributos_detalhado: { nome: string; sigla: string; valor: number; percentual: number }[];
  margem: number;
  bdi_percentual: number;
  bdi_valor: number;
  preco_final_bdi: number;
  memoria: MemoriaCalculo[];
}

export interface ResultadoDRE {
  receita_bruta: number;
  tributos_total: number;
  receita_liquida: number;
  custo_direto: number;
  lucro_bruto: number;
  admin_local: number;
  admin_central: number;
  financiamento: number;
  despesas_totais: number;
  lucro_operacional: number;
  margem_operacional_percentual: number;
  memoria: MemoriaCalculo[];
}

export interface MetricasProjeto {
  custo_direto: number;
  custo_total: number;
  preco_final: number;
  num_equipes: number;
  prazo_dias: number;
  prazo_meses: number;
  custo_por_equipe_dia: number;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

// ===== BDI =====
export function calcularBDI(custoDireto: number, params: ParametrosBDI): ResultadoBDI {
  const memoria: MemoriaCalculo[] = [];

  memoria.push({ descricao: "Custo Direto", formula: `R$ ${fmt(custoDireto)}`, valor: custoDireto });

  const adminLocal = custoDireto * (params.admin_local_percentual / 100);
  memoria.push({ descricao: "Administração Local", formula: `${fmt(custoDireto)} × ${fmt(params.admin_local_percentual)}% = ${fmt(adminLocal)}`, valor: adminLocal });

  const adminCentral = custoDireto * (params.admin_central_percentual / 100);
  memoria.push({ descricao: "Administração Central", formula: `${fmt(custoDireto)} × ${fmt(params.admin_central_percentual)}% = ${fmt(adminCentral)}`, valor: adminCentral });

  const custoIndireto = adminLocal + adminCentral;
  memoria.push({ descricao: "Custo Indireto (AL + AC)", formula: `${fmt(adminLocal)} + ${fmt(adminCentral)} = ${fmt(custoIndireto)}`, valor: custoIndireto });

  const subtotalAntesFin = custoDireto + custoIndireto;
  const financiamento = subtotalAntesFin * (params.financiamento_percentual / 100);
  memoria.push({ descricao: "Financiamento", formula: `${fmt(subtotalAntesFin)} × ${fmt(params.financiamento_percentual)}% = ${fmt(financiamento)}`, valor: financiamento });

  const subtotalAntesBDI = subtotalAntesFin + financiamento;
  memoria.push({ descricao: "Subtotal (CD + CI + Fin)", formula: `${fmt(subtotalAntesFin)} + ${fmt(financiamento)} = ${fmt(subtotalAntesBDI)}`, valor: subtotalAntesBDI });

  // BDI por fórmula: BDI = ((1+AC)(1+S)(1+R)(1+F)) / (1-I-L) - 1
  // Simplificação: calculamos percentuais sobre o custo direto
  const totalTributosPerc = params.tributos.reduce((s, t) => s + t.percentual, 0);
  
  // Preço de venda = Subtotal / (1 - tributos% - margem%)
  const denominador = 1 - (totalTributosPerc / 100) - (params.margem_percentual / 100);
  const precoFinal = denominador > 0 ? subtotalAntesBDI / denominador : subtotalAntesBDI;
  
  const tributosDetalhado = params.tributos.map((t) => {
    const valor = precoFinal * (t.percentual / 100);
    return { ...t, valor };
  });
  const tributosTotal = tributosDetalhado.reduce((s, t) => s + t.valor, 0);
  
  tributosDetalhado.forEach((t) => {
    memoria.push({ descricao: `${t.nome} (${t.sigla})`, formula: `${fmt(precoFinal)} × ${fmt(t.percentual)}% = ${fmt(t.valor)}`, valor: t.valor });
  });
  memoria.push({ descricao: "Total Tributos", formula: `R$ ${fmt(tributosTotal)}`, valor: tributosTotal });

  const margem = precoFinal * (params.margem_percentual / 100);
  memoria.push({ descricao: "Margem de Lucro", formula: `${fmt(precoFinal)} × ${fmt(params.margem_percentual)}% = ${fmt(margem)}`, valor: margem });

  const bdiValor = precoFinal - custoDireto;
  const bdiPercentual = custoDireto > 0 ? (bdiValor / custoDireto) * 100 : 0;
  memoria.push({ descricao: "BDI (valor)", formula: `${fmt(precoFinal)} - ${fmt(custoDireto)} = ${fmt(bdiValor)}`, valor: bdiValor });
  memoria.push({ descricao: "BDI (%)", formula: `${fmt(bdiValor)} / ${fmt(custoDireto)} × 100 = ${fmt(bdiPercentual)}%`, valor: bdiPercentual });
  memoria.push({ descricao: "Preço Final (BDI)", formula: `R$ ${fmt(precoFinal)}`, valor: precoFinal });

  return {
    custo_direto: custoDireto,
    admin_local: adminLocal,
    admin_central: adminCentral,
    custo_indireto: custoIndireto,
    financiamento,
    subtotal_antes_bdi: subtotalAntesBDI,
    tributos_total: tributosTotal,
    tributos_detalhado: tributosDetalhado,
    margem,
    bdi_percentual: bdiPercentual,
    bdi_valor: bdiValor,
    preco_final_bdi: precoFinal,
    memoria,
  };
}

// ===== DRE =====
export function calcularDRE(precoVenda: number, custoDireto: number, params: ParametrosBDI): ResultadoDRE {
  const memoria: MemoriaCalculo[] = [];

  const receitaBruta = precoVenda;
  memoria.push({ descricao: "Receita Bruta", formula: `R$ ${fmt(receitaBruta)}`, valor: receitaBruta });

  const totalTributosPerc = params.tributos.reduce((s, t) => s + t.percentual, 0);
  const tributosTotal = receitaBruta * (totalTributosPerc / 100);
  memoria.push({ descricao: "(-) Tributos sobre Receita", formula: `${fmt(receitaBruta)} × ${fmt(totalTributosPerc)}% = ${fmt(tributosTotal)}`, valor: tributosTotal });

  const receitaLiquida = receitaBruta - tributosTotal;
  memoria.push({ descricao: "Receita Líquida", formula: `${fmt(receitaBruta)} - ${fmt(tributosTotal)} = ${fmt(receitaLiquida)}`, valor: receitaLiquida });

  memoria.push({ descricao: "(-) Custo Direto", formula: `R$ ${fmt(custoDireto)}`, valor: custoDireto });

  const lucroBruto = receitaLiquida - custoDireto;
  memoria.push({ descricao: "Lucro Bruto", formula: `${fmt(receitaLiquida)} - ${fmt(custoDireto)} = ${fmt(lucroBruto)}`, valor: lucroBruto });

  const adminLocal = custoDireto * (params.admin_local_percentual / 100);
  memoria.push({ descricao: "(-) Administração Local", formula: `${fmt(custoDireto)} × ${fmt(params.admin_local_percentual)}% = ${fmt(adminLocal)}`, valor: adminLocal });

  const adminCentral = custoDireto * (params.admin_central_percentual / 100);
  memoria.push({ descricao: "(-) Administração Central", formula: `${fmt(custoDireto)} × ${fmt(params.admin_central_percentual)}% = ${fmt(adminCentral)}`, valor: adminCentral });

  const financiamento = (custoDireto + adminLocal + adminCentral) * (params.financiamento_percentual / 100);
  memoria.push({ descricao: "(-) Financiamento", formula: `${fmt(custoDireto + adminLocal + adminCentral)} × ${fmt(params.financiamento_percentual)}% = ${fmt(financiamento)}`, valor: financiamento });

  const despesasTotais = adminLocal + adminCentral + financiamento;
  memoria.push({ descricao: "Total Despesas Operacionais", formula: `${fmt(adminLocal)} + ${fmt(adminCentral)} + ${fmt(financiamento)} = ${fmt(despesasTotais)}`, valor: despesasTotais });

  const lucroOperacional = lucroBruto - despesasTotais;
  memoria.push({ descricao: "Lucro Operacional", formula: `${fmt(lucroBruto)} - ${fmt(despesasTotais)} = ${fmt(lucroOperacional)}`, valor: lucroOperacional });

  const margemOperacional = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0;
  memoria.push({ descricao: "Margem Operacional", formula: `${fmt(lucroOperacional)} / ${fmt(receitaBruta)} × 100 = ${fmt(margemOperacional)}%`, valor: margemOperacional });

  return {
    receita_bruta: receitaBruta,
    tributos_total: tributosTotal,
    receita_liquida: receitaLiquida,
    custo_direto: custoDireto,
    lucro_bruto: lucroBruto,
    admin_local: adminLocal,
    admin_central: adminCentral,
    financiamento,
    despesas_totais: despesasTotais,
    lucro_operacional: lucroOperacional,
    margem_operacional_percentual: margemOperacional,
    memoria,
  };
}

// ===== MÉTRICAS DE PROJETO =====
export function calcularMetricasProjeto(
  custoDireto: number,
  precoFinal: number,
  produtividadePorEquipeDia: number,
  quantidadeTotal: number,
  numEquipes: number
): MetricasProjeto {
  const prazoDias = produtividadePorEquipeDia > 0 && numEquipes > 0
    ? Math.ceil(quantidadeTotal / (produtividadePorEquipeDia * numEquipes))
    : 0;
  const prazoMeses = prazoDias > 0 ? prazoDias / 22 : 0;
  const custoPorEquipeDia = prazoDias > 0 && numEquipes > 0
    ? custoDireto / (prazoDias * numEquipes)
    : 0;

  return {
    custo_direto: custoDireto,
    custo_total: precoFinal,
    preco_final: precoFinal,
    num_equipes: numEquipes,
    prazo_dias: prazoDias,
    prazo_meses: prazoMeses,
    custo_por_equipe_dia: custoPorEquipeDia,
  };
}

export function getDefaultParametrosBDI(): ParametrosBDI {
  return {
    admin_local_percentual: 15,
    admin_central_percentual: 8,
    financiamento_percentual: 1.5,
    tributos: [
      { nome: "PIS", sigla: "PIS", percentual: 0.65 },
      { nome: "COFINS", sigla: "COFINS", percentual: 3.0 },
      { nome: "ISS", sigla: "ISS", percentual: 5.0 },
    ],
    margem_percentual: 10,
  };
}

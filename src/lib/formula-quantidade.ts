/**
 * Avaliador de fórmulas de quantidade — versão TypeScript
 *
 * Espelha a função SQL `avaliar_formula_quantidade`. Usado no front para:
 *   - Validar fórmulas antes de salvar template
 *   - Mostrar preview do valor ao orçamentista enquanto digita
 *   - Recalcular ao vivo quando parâmetros do projeto mudam
 *
 * Importante manter a paridade com a função SQL: mesma whitelist de
 * variáveis e funções, mesmo comportamento de "negativo → 0".
 */

export interface ParametrosFormula {
  qtd_propriedades: number;
  extensao_km: number;
  qtd_pessoas: number;
  qtd_equipes: number;
  qtd_supervisores: number;
  dias_projeto: number;
  meses_projeto: number;
  distancia_base_km: number;
}

const VARIAVEIS_PERMITIDAS = [
  "qtd_propriedades",
  "extensao_km",
  "qtd_pessoas",
  "qtd_equipes",
  "qtd_supervisores",
  "dias_projeto",
  "meses_projeto",
  "distancia_base_km",
] as const;

const FUNCOES_PERMITIDAS = ["ceil", "floor", "round", "abs", "greatest", "least"] as const;

const TODOS_IDENTIFICADORES = [...VARIAVEIS_PERMITIDAS, ...FUNCOES_PERMITIDAS];

/**
 * Valida a fórmula. Retorna null se válida, ou string com mensagem de erro.
 */
export function validarFormula(formula: string): string | null {
  if (!formula || formula.trim().length === 0) {
    return "Fórmula vazia";
  }

  // Caracteres permitidos: letras, dígitos, espaços, _ + - * / ( ) , .
  if (/[^a-zA-Z0-9_+\-*/().,\s]/.test(formula)) {
    return "Fórmula contém caracteres não permitidos";
  }

  // Extrair identificadores (palavras com 2+ chars)
  const identificadores = formula.match(/[a-zA-Z_][a-zA-Z0-9_]+/g) ?? [];
  for (const id of identificadores) {
    if (!TODOS_IDENTIFICADORES.includes(id as never)) {
      return `Identificador não permitido: "${id}"`;
    }
  }

  return null;
}

/**
 * Calcula meses_projeto a partir de dias.
 */
function calcMesesProjeto(dias: number): number {
  if (dias <= 0) return 0;
  return Math.ceil(dias / 22);
}

/**
 * Avalia uma fórmula com os parâmetros dados.
 * Retorna { valor, erro }.
 */
export function avaliarFormula(
  formula: string,
  paramsParcial: Omit<ParametrosFormula, "meses_projeto"> & { meses_projeto?: number }
): { valor: number; erro: string | null } {
  const erro = validarFormula(formula);
  if (erro) return { valor: 0, erro };

  const params: ParametrosFormula = {
    ...paramsParcial,
    meses_projeto: paramsParcial.meses_projeto ?? calcMesesProjeto(paramsParcial.dias_projeto),
  };

  // Substituir variáveis pelos valores
  let expr = formula;
  for (const v of VARIAVEIS_PERMITIDAS) {
    // \b funciona aqui porque os nomes têm chars que pertencem a word boundary
    const re = new RegExp(`\\b${v}\\b`, "g");
    expr = expr.replace(re, String(params[v]));
  }

  // Substituir funções: ceil → Math.ceil, etc.
  expr = expr
    .replace(/\bceil\b/g, "Math.ceil")
    .replace(/\bfloor\b/g, "Math.floor")
    .replace(/\bround\b/g, "Math.round")
    .replace(/\babs\b/g, "Math.abs")
    .replace(/\bgreatest\b/g, "Math.max")
    .replace(/\bleast\b/g, "Math.min");

  // Avaliação segura: usar Function constructor com escopo controlado.
  // Como já validamos tudo na whitelist acima, é seguro.
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function(`"use strict"; return (${expr});`);
    const resultado = fn();
    if (typeof resultado !== "number" || !Number.isFinite(resultado)) {
      return { valor: 0, erro: "Resultado não é número finito" };
    }
    // Resultado negativo é zerado (mesma regra da função SQL)
    return { valor: Math.max(0, resultado), erro: null };
  } catch (e) {
    return { valor: 0, erro: `Erro na avaliação: ${(e as Error).message}` };
  }
}

/**
 * Lista as variáveis permitidas (para mostrar em autocomplete/help).
 */
export function variaveisPermitidas(): readonly string[] {
  return VARIAVEIS_PERMITIDAS;
}

/**
 * Lista as funções permitidas.
 */
export function funcoesPermitidas(): readonly string[] {
  return FUNCOES_PERMITIDAS;
}

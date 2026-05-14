/**
 * Admin Local — lógica de cálculo de quantidade e valor por item
 *
 * Sprint 4: substitui o cálculo plano antigo por um sistema baseado em
 * categorias com fórmulas de escala. Cada categoria tem uma escala padrão
 * (por_pessoa, por_dia, por_equipe_dia, etc.) que define como a quantidade
 * é calculada automaticamente a partir dos parâmetros do projeto.
 *
 * Importante:
 *   - Itens de Mobilização/Desmobilização têm `frequencia_evento` que
 *     multiplica por 2 quando ida_e_volta.
 *   - Itens com `vincula_cargo` usam o custo do cargo como valor_unitario.
 *   - Itens com `is_epi` calculam substituições = ceil(meses / vida_util).
 *   - Sempre que `*_manual = true`, o valor não é recalculado.
 */

export type AdminLocalBloco =
  | "mobilizacao_desmobilizacao"
  | "permanencia"
  | "supervisao";

export type AdminLocalEscala =
  | "fixo"
  | "por_pessoa"
  | "por_equipe"
  | "por_dia"
  | "por_mes"
  | "por_km"
  | "por_propriedade"
  | "por_pessoa_dia"
  | "por_pessoa_mes"
  | "por_equipe_dia"
  | "por_equipe_mes"
  | "percentual_aluguel";

export type FrequenciaEvento = "ida" | "volta" | "ida_e_volta" | "fixo";

export interface ParametrosProjeto {
  qtd_pessoas_equipe: number;     // total de pessoas (todas as equipes)
  qtd_equipes: number;
  dias_projeto: number;
  meses_projeto: number;           // calculado: ceil(dias / 22) ou similar
  distancia_km: number;            // base → obra (uma direção)
  qtd_propriedades: number;        // ou unidades, dependendo do projeto
  qtd_supervisores: number;        // soma de supervisores ativos (puxa para permanência)
}

export interface CategoriaCalculo {
  codigo: string;
  bloco: AdminLocalBloco;
  escala_padrao: AdminLocalEscala;
  valor_referencia: number;
  frequencia_evento_padrao: FrequenciaEvento | null;
  vincula_cargo: boolean;
  is_epi: boolean;
  vida_util_meses: number | null;
}

export interface ItemContext {
  categoria: CategoriaCalculo;
  escala_aplicada?: AdminLocalEscala;     // override
  frequencia_evento?: FrequenciaEvento;    // override (mob/desmob)
  dedicacao_percentual?: number;           // supervisão: 0-100
  cargo_custo_unitario?: number;           // quando vincula_cargo
  valor_unitario_manual?: number;          // override do valor
  quantidade_manual?: number;              // override da quantidade
  /** Para PERM_MANUTENCAO_VEIC: o valor de aluguel ao qual aplicar % */
  valor_aluguel_base?: number;
}

export interface ResultadoCalculoAdminLocal {
  quantidade: number;
  valor_unitario: number;
  total: number;
  memoria: string[];
}

/**
 * Multiplicador para frequência de evento (mob/desmob)
 */
function multiplicadorEvento(freq: FrequenciaEvento | null | undefined): number {
  if (freq === "ida_e_volta") return 2;
  if (freq === "ida" || freq === "volta") return 1;
  return 1; // fixo
}

/**
 * Calcula quantidade automática a partir de escala + parâmetros do projeto.
 * Retorna -1 se a escala é inválida ou os parâmetros estão zerados.
 */
export function calcularQuantidade(
  escala: AdminLocalEscala,
  params: ParametrosProjeto,
  context: ItemContext
): { quantidade: number; memoria: string } {
  let q = 0;
  let mem = "";

  switch (escala) {
    case "fixo":
      q = 1;
      mem = "Fixo (1 unidade)";
      break;
    case "por_pessoa":
      q = params.qtd_pessoas_equipe;
      mem = `${params.qtd_pessoas_equipe} pessoas`;
      break;
    case "por_equipe":
      q = params.qtd_equipes;
      mem = `${params.qtd_equipes} equipes`;
      break;
    case "por_dia":
      q = params.dias_projeto;
      mem = `${params.dias_projeto} dias`;
      break;
    case "por_mes":
      q = params.meses_projeto;
      mem = `${params.meses_projeto} meses`;
      break;
    case "por_km":
      q = params.distancia_km;
      mem = `${params.distancia_km} km`;
      break;
    case "por_propriedade":
      q = params.qtd_propriedades;
      mem = `${params.qtd_propriedades} propriedades`;
      break;
    case "por_pessoa_dia":
      // Inclui supervisores na hospedagem (eles ficam no mesmo hotel)
      {
        const pessoas =
          context.categoria.codigo.startsWith("PERM_HOSPEDAGEM")
            ? params.qtd_pessoas_equipe + params.qtd_supervisores
            : params.qtd_pessoas_equipe;
        q = pessoas * params.dias_projeto;
        mem = `${pessoas} pessoas × ${params.dias_projeto} dias`;
      }
      break;
    case "por_pessoa_mes":
      q = params.qtd_pessoas_equipe * params.meses_projeto;
      mem = `${params.qtd_pessoas_equipe} pessoas × ${params.meses_projeto} meses`;
      break;
    case "por_equipe_dia":
      q = params.qtd_equipes * params.dias_projeto;
      mem = `${params.qtd_equipes} equipes × ${params.dias_projeto} dias`;
      break;
    case "por_equipe_mes":
      q = params.qtd_equipes * params.meses_projeto;
      mem = `${params.qtd_equipes} equipes × ${params.meses_projeto} meses`;
      break;
    case "percentual_aluguel":
      // Trata-se de manutenção: quantidade é o % aplicado sobre valor_aluguel_base
      // O valor_unitario aqui contém o valor de aluguel, e quantidade = percentual / 100
      // Mas convenção alternativa: q = 1 e valor_unitario = aluguel × (% / 100)
      // Vamos usar a segunda: q=1, e o cálculo do valor_unitario é feito separado
      q = 1;
      mem = `Manutenção como % do aluguel`;
      break;
  }

  return { quantidade: q, memoria: mem };
}

/**
 * Calcula um item completo: quantidade, valor unitário, total e memória.
 * Lida com: escala, frequência de evento, vínculo a cargo, EPI, manual override.
 */
export function calcularItemAdminLocal(
  params: ParametrosProjeto,
  context: ItemContext
): ResultadoCalculoAdminLocal {
  const memoria: string[] = [];
  const cat = context.categoria;

  // ===== QUANTIDADE =====
  let quantidade: number;

  if (context.quantidade_manual !== undefined) {
    quantidade = context.quantidade_manual;
    memoria.push(`Quantidade manual: ${quantidade}`);
  } else if (cat.is_epi) {
    // EPI: qtd_pessoas × substituições
    const meses = params.meses_projeto;
    const vida = cat.vida_util_meses ?? 12;
    const substituicoes = Math.ceil(meses / vida);
    quantidade = params.qtd_pessoas_equipe * substituicoes;
    memoria.push(
      `EPI: ${params.qtd_pessoas_equipe} pessoas × ${substituicoes} substituição(ões) ` +
      `(projeto ${meses} meses ÷ vida útil ${vida} meses, arredondado para cima)`
    );
  } else {
    const escala = context.escala_aplicada ?? cat.escala_padrao;
    const calc = calcularQuantidade(escala, params, context);
    quantidade = calc.quantidade;
    memoria.push(`Quantidade: ${calc.memoria}`);
  }

  // Aplicar frequência de evento (mob/desmob)
  if (cat.bloco === "mobilizacao_desmobilizacao") {
    const freq = context.frequencia_evento ?? cat.frequencia_evento_padrao ?? "fixo";
    const mult = multiplicadorEvento(freq);
    if (mult > 1) {
      quantidade = quantidade * mult;
      memoria.push(`Evento ${freq}: × ${mult}`);
    }
  }

  // ===== VALOR UNITÁRIO =====
  let valorUnitario: number;

  if (context.valor_unitario_manual !== undefined) {
    valorUnitario = context.valor_unitario_manual;
    memoria.push(`Valor unitário manual: R$ ${valorUnitario.toFixed(2)}`);
  } else if (cat.vincula_cargo && context.cargo_custo_unitario !== undefined) {
    // Supervisão vinculada a cargo: aplica dedicação
    const ded = (context.dedicacao_percentual ?? 100) / 100;
    valorUnitario = context.cargo_custo_unitario * ded;
    memoria.push(
      `Custo mensal cargo: R$ ${context.cargo_custo_unitario.toFixed(2)} × ` +
      `${(ded * 100).toFixed(0)}% dedicação = R$ ${valorUnitario.toFixed(2)}`
    );
  } else if (cat.escala_padrao === "percentual_aluguel") {
    // Manutenção: % sobre aluguel
    const aluguel = context.valor_aluguel_base ?? 0;
    const pct = cat.valor_referencia / 100;
    valorUnitario = aluguel * pct;
    memoria.push(
      `Manutenção: R$ ${aluguel.toFixed(2)} (aluguel) × ${cat.valor_referencia}% = R$ ${valorUnitario.toFixed(2)}`
    );
  } else {
    valorUnitario = cat.valor_referencia;
    memoria.push(`Valor referência: R$ ${valorUnitario.toFixed(2)}`);
  }

  const total = quantidade * valorUnitario;
  memoria.push(`Total: ${quantidade} × R$ ${valorUnitario.toFixed(2)} = R$ ${total.toFixed(2)}`);

  return { quantidade, valor_unitario: valorUnitario, total, memoria };
}

/**
 * Totaliza uma lista de itens por bloco.
 */
export interface TotalAdminLocal {
  mobilizacao_desmobilizacao: number;
  permanencia: number;
  supervisao: number;
  total: number;
}

export function totalizarAdminLocal(
  itens: { categoria_bloco: AdminLocalBloco; total: number }[]
): TotalAdminLocal {
  const tot: TotalAdminLocal = {
    mobilizacao_desmobilizacao: 0,
    permanencia: 0,
    supervisao: 0,
    total: 0,
  };
  for (const item of itens) {
    tot[item.categoria_bloco] += item.total;
    tot.total += item.total;
  }
  return tot;
}

/**
 * Util: calcula meses de projeto a partir de dias.
 * Convenção: 1 mês = 22 dias úteis (corresponde a jornada padrão).
 */
export function diasParaMeses(dias: number): number {
  if (dias <= 0) return 0;
  return Math.ceil(dias / 22);
}

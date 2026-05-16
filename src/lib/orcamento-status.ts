/**
 * Status e progresso unificados do orçamento.
 * Fonte única de verdade para indicar onde o usuário está no fluxo.
 */

export type OrcamentoStepKey = "oportunidade" | "servicos" | "adm-local" | "bdi-preco";

export interface OrcamentoStatusInput {
  oportunidade?: { id?: string; grupo_servicos_id?: string | null } | null;
  temServicos?: boolean;
  temMobilizacao?: boolean;
  temBdi?: boolean;
}

export interface OrcamentoStatusResult {
  /** rascunho | em_andamento | finalizado */
  status: "rascunho" | "em_andamento" | "finalizado";
  /** 0..100 */
  percentual: number;
  /** Próxima etapa a completar (ou null se finalizado) */
  proximoPasso: OrcamentoStepKey | null;
  /** Lista legível de pendências */
  pendencias: string[];
  /** Mapa booleano por etapa */
  etapas: Record<OrcamentoStepKey, boolean>;
}

export function calcularStatusOrcamento(input: OrcamentoStatusInput): OrcamentoStatusResult {
  const etapas: Record<OrcamentoStepKey, boolean> = {
    oportunidade: !!input.oportunidade && !!input.oportunidade.grupo_servicos_id,
    servicos: !!input.temServicos,
    "adm-local": !!input.temMobilizacao,
    "bdi-preco": !!input.temBdi,
  };

  const ordem: OrcamentoStepKey[] = ["oportunidade", "servicos", "adm-local", "bdi-preco"];
  const concluidas = ordem.filter((k) => etapas[k]).length;
  const percentual = Math.round((concluidas / ordem.length) * 100);
  const proximoPasso = ordem.find((k) => !etapas[k]) ?? null;

  const labelByKey: Record<OrcamentoStepKey, string> = {
    oportunidade: "Definir grupo de serviços na oportunidade",
    servicos: "Selecionar serviços e quantidades",
    "adm-local": "Configurar ADM Local (mobilização)",
    "bdi-preco": "Definir BDI e preço de venda",
  };
  const pendencias = ordem.filter((k) => !etapas[k]).map((k) => labelByKey[k]);

  const status: OrcamentoStatusResult["status"] =
    concluidas === ordem.length ? "finalizado" : concluidas === 0 ? "rascunho" : "em_andamento";

  return { status, percentual, proximoPasso, pendencias, etapas };
}

export const ORCAMENTO_STATUS_LABEL: Record<OrcamentoStatusResult["status"], string> = {
  rascunho: "Rascunho",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
};

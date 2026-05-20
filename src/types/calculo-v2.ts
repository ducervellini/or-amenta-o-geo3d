/**
 * Tipos de apoio para a Fase 1 de correções BDI/CCU.
 * Centraliza versionamento da metodologia de cálculo, modelos de BDI,
 * regimes tributários especiais e classificação logística regional.
 */

export type MetodologiaCalculoVersao = "v1_legado" | "v2_corrigido";

/** Metodologia vigente para novos orçamentos. */
export const METODOLOGIA_VIGENTE: MetodologiaCalculoVersao = "v2_corrigido";

export type BdiMetodologia = "simplificado" | "tcu_2622";

export type RegimeTributario =
  | "padrao"
  | "reidi"
  | "simples_nacional"
  | "mei"
  | "isento_municipio";

export type Bioma =
  | "amazonia"
  | "cerrado"
  | "caatinga"
  | "mata_atlantica"
  | "pampa"
  | "pantanal"
  | "urbano";

export type TipoVia =
  | "rodovia_federal"
  | "rodovia_estadual"
  | "vicinal_pavimentada"
  | "vicinal_nao_pavimentada";

export type CodigoTCU =
  | "AC"
  | "S"
  | "G"
  | "R"
  | "DF"
  | "L"
  | "IT_PIS"
  | "IT_COFINS"
  | "IT_ISS"
  | "IT_IRPJ"
  | "IT_CSLL"
  | "OUTRO";

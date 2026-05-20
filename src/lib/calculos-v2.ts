/**
 * Fase 1 — calculadores corrigidos (BDI/CCU).
 *
 * Reúne em um único módulo:
 *  - aplicarFatorUtilizacao  (v1 multiplica × v2 divide)
 *  - calcularBDITCU2622      (fórmula oficial Acórdão TCU 2622/2013)
 *  - percentualEfetivoTributo (zera tributos conforme regime especial)
 *  - obterParametrosRegionais (UF/bioma) com cache em memória
 *
 * Importações:
 *   import { aplicarFatorUtilizacao, ... } from "@/lib/calculos-v2";
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  MetodologiaCalculoVersao,
  RegimeTributario,
  Bioma,
  TipoVia,
} from "@/types/calculo-v2";

// ============================================================
// 1) Fator de utilização corrigido
// ------------------------------------------------------------
// v1_legado:  custoBruto * fu   (subestima — antigo)
// v2_corrigido: custoBruto / fu (correto: equipamento ocioso encarece a hora)
// ============================================================
export function aplicarFatorUtilizacao(
  custoBruto: number,
  fu: number,
  metodologia: MetodologiaCalculoVersao,
): number {
  if (!Number.isFinite(custoBruto) || custoBruto < 0) return 0;
  if (!Number.isFinite(fu) || fu <= 0) return custoBruto;
  const fuClamp = fu > 1 ? 1 : fu;
  return metodologia === "v2_corrigido" ? custoBruto / fuClamp : custoBruto * fuClamp;
}

// ============================================================
// 2) BDI — fórmula oficial TCU 2622/2013
//    BDI = ((1+AC+S+G+R)(1+DF)(1+L) / (1-IT)) - 1
// ============================================================
export interface ParametrosTCU2622 {
  /** Administração central */
  AC: number;
  /** Seguros */
  S: number;
  /** Garantia */
  G: number;
  /** Riscos */
  R: number;
  /** Despesas financeiras */
  DF: number;
  /** Lucro */
  L: number;
  IT_PIS: number;
  IT_COFINS: number;
  IT_ISS: number;
  IT_IRPJ: number;
  IT_CSLL: number;
}

export interface ResultadoTCU2622 {
  bdi: number;
  bdiPercentual: number;
  IT_total: number;
  numerador: number;
  denominador: number;
  precoVenda: number;
  memoria: Array<{ componente: string; valor: number; contribuicao: number }>;
}

export function calcularBDITCU2622(
  CD: number,
  p: ParametrosTCU2622,
): ResultadoTCU2622 {
  if (!Number.isFinite(CD) || CD < 0) throw new Error("CD negativo ou inválido");
  if (Object.values(p).some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error("Parâmetro de BDI negativo ou inválido");
  }
  const IT = p.IT_PIS + p.IT_COFINS + p.IT_ISS + p.IT_IRPJ + p.IT_CSLL;
  if (IT >= 1) throw new Error("Soma de IT (tributos) ≥ 1 — impossível formar preço");

  const num = (1 + p.AC + p.S + p.G + p.R) * (1 + p.DF) * (1 + p.L);
  const den = 1 - IT;
  const bdi = num / den - 1;
  const pv = CD * (1 + bdi);

  const safeBdi = bdi !== 0 ? bdi : 1;
  const m = (n: string, v: number) => ({
    componente: n,
    valor: v,
    contribuicao: (v / safeBdi) * 100,
  });

  return {
    bdi,
    bdiPercentual: bdi * 100,
    IT_total: IT,
    numerador: num,
    denominador: den,
    precoVenda: pv,
    memoria: [
      m("AC", p.AC),
      m("S", p.S),
      m("G", p.G),
      m("R", p.R),
      m("DF", p.DF),
      m("L", p.L),
      m("IT", IT),
    ],
  };
}

// ============================================================
// 3) Regime tributário (REIDI / Simples / MEI)
// ============================================================
export interface TributoComFlags {
  percentual: number;
  aplicavel_reidi: boolean;
  aplicavel_simples: boolean;
  aplicavel_mei: boolean;
}

export function percentualEfetivoTributo(
  t: TributoComFlags,
  r: RegimeTributario,
): number {
  if (r === "reidi" && t.aplicavel_reidi) return 0;
  if (r === "simples_nacional" && t.aplicavel_simples) return 0;
  if (r === "mei" && t.aplicavel_mei) return 0;
  return t.percentual;
}

// ============================================================
// 4) Parâmetros logísticos regionais (com cache em memória)
// ============================================================
export interface ParametrosRegionais {
  uf: string;
  bioma: Bioma;
  fator_rota: Record<TipoVia, number>;
  velocidade_media_kmh: number;
  fator_chuva_produtividade: number;
}

const FALLBACK: Omit<ParametrosRegionais, "uf" | "bioma"> = {
  fator_rota: {
    rodovia_federal: 1.3,
    rodovia_estadual: 1.45,
    vicinal_pavimentada: 1.6,
    vicinal_nao_pavimentada: 1.8,
  },
  velocidade_media_kmh: 80,
  fator_chuva_produtividade: 0.5,
};

const _cacheLog = new Map<string, ParametrosRegionais>();

export async function obterParametrosRegionais(
  uf: string,
  bioma?: Bioma,
): Promise<ParametrosRegionais> {
  const ufN = (uf || "").toUpperCase().slice(0, 2);
  const key = `${ufN}:${bioma ?? "auto"}`;
  if (_cacheLog.has(key)) return _cacheLog.get(key)!;

  let q = supabase
    .from("parametros_logistica_regional" as never)
    .select("*")
    .eq("uf", ufN)
    .is("deleted_at", null)
    .eq("ativo", true);
  if (bioma) q = q.eq("bioma", bioma);
  const { data } = await q.limit(1).maybeSingle();

  const row = data as {
    uf: string;
    bioma: string;
    fator_rota_rodovia_federal: number | string;
    fator_rota_rodovia_estadual: number | string;
    fator_rota_vicinal_pavimentada: number | string;
    fator_rota_vicinal_nao_pavimentada: number | string;
    velocidade_media_kmh: number;
    fator_chuva_produtividade: number | string;
  } | null;

  const params: ParametrosRegionais = row
    ? {
        uf: row.uf,
        bioma: row.bioma as Bioma,
        fator_rota: {
          rodovia_federal: Number(row.fator_rota_rodovia_federal),
          rodovia_estadual: Number(row.fator_rota_rodovia_estadual),
          vicinal_pavimentada: Number(row.fator_rota_vicinal_pavimentada),
          vicinal_nao_pavimentada: Number(row.fator_rota_vicinal_nao_pavimentada),
        },
        velocidade_media_kmh: Number(row.velocidade_media_kmh),
        fator_chuva_produtividade: Number(row.fator_chuva_produtividade),
      }
    : { uf: ufN, bioma: bioma ?? "cerrado", ...FALLBACK };

  _cacheLog.set(key, params);
  return params;
}

export function limparCacheLogistica(): void {
  _cacheLog.clear();
}

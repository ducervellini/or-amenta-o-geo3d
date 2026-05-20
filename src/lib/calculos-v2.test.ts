import { describe, it, expect } from "vitest";
import {
  aplicarFatorUtilizacao,
  calcularBDITCU2622,
  percentualEfetivoTributo,
  type ParametrosTCU2622,
  type TributoComFlags,
} from "./calculos-v2";

describe("aplicarFatorUtilizacao", () => {
  it("v1_legado multiplica pelo FU (comportamento antigo)", () => {
    expect(aplicarFatorUtilizacao(100, 0.5, "v1_legado")).toBe(50);
  });

  it("v2_corrigido divide pelo FU (equipamento ocioso encarece a hora)", () => {
    expect(aplicarFatorUtilizacao(100, 0.5, "v2_corrigido")).toBe(200);
  });

  it("clampa FU > 1 para 1 em ambos modos", () => {
    expect(aplicarFatorUtilizacao(100, 1.5, "v2_corrigido")).toBe(100);
    expect(aplicarFatorUtilizacao(100, 1.5, "v1_legado")).toBe(100);
  });

  it("FU inválido retorna custo bruto sem alteração", () => {
    expect(aplicarFatorUtilizacao(100, 0, "v2_corrigido")).toBe(100);
    expect(aplicarFatorUtilizacao(100, -1, "v2_corrigido")).toBe(100);
  });

  it("custo negativo é normalizado para zero", () => {
    expect(aplicarFatorUtilizacao(-50, 0.8, "v2_corrigido")).toBe(0);
  });
});

describe("calcularBDITCU2622", () => {
  const baseObra: ParametrosTCU2622 = {
    AC: 0.04, S: 0.008, G: 0.004, R: 0.0097,
    DF: 0.0123, L: 0.0807,
    IT_PIS: 0.0065, IT_COFINS: 0.03, IT_ISS: 0.05, IT_IRPJ: 0, IT_CSLL: 0,
  };

  it("BDI fica na faixa típica de obras (≈25–35%)", () => {
    const r = calcularBDITCU2622(100_000, baseObra);
    expect(r.bdiPercentual).toBeGreaterThanOrEqual(25);
    expect(r.bdiPercentual).toBeLessThanOrEqual(35);
    expect(r.precoVenda).toBeCloseTo(100_000 * (1 + r.bdi), 4);
  });

  it("rejeita IT ≥ 1 (denominador zero/negativo)", () => {
    expect(() =>
      calcularBDITCU2622(1000, { ...baseObra, IT_PIS: 0.9, IT_COFINS: 0.2 }),
    ).toThrow(/IT.*≥ 1/);
  });

  it("rejeita CD negativo", () => {
    expect(() => calcularBDITCU2622(-1, baseObra)).toThrow();
  });

  it("rejeita parâmetro negativo", () => {
    expect(() => calcularBDITCU2622(1000, { ...baseObra, L: -0.01 })).toThrow();
  });

  it("monta memória com todos os componentes", () => {
    const r = calcularBDITCU2622(1000, baseObra);
    const nomes = r.memoria.map((m) => m.componente);
    expect(nomes).toEqual(["AC", "S", "G", "R", "DF", "L", "IT"]);
  });
});

describe("percentualEfetivoTributo", () => {
  const pis: TributoComFlags = {
    percentual: 0.65, aplicavel_reidi: true, aplicavel_simples: true, aplicavel_mei: true,
  };
  const iss: TributoComFlags = {
    percentual: 5, aplicavel_reidi: false, aplicavel_simples: false, aplicavel_mei: false,
  };

  it("REIDI zera PIS/COFINS aplicáveis", () => {
    expect(percentualEfetivoTributo(pis, "reidi")).toBe(0);
  });

  it("REIDI mantém ISS (não aplicável)", () => {
    expect(percentualEfetivoTributo(iss, "reidi")).toBe(5);
  });

  it("Padrão mantém todos os tributos", () => {
    expect(percentualEfetivoTributo(pis, "padrao")).toBe(0.65);
    expect(percentualEfetivoTributo(iss, "padrao")).toBe(5);
  });

  it("Simples Nacional zera tributos federais flagados", () => {
    expect(percentualEfetivoTributo(pis, "simples_nacional")).toBe(0);
  });

  it("MEI zera tributos flagados", () => {
    expect(percentualEfetivoTributo(pis, "mei")).toBe(0);
  });
});

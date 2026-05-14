import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte qualquer valor (string, number, null, undefined, NaN) em number seguro.
 * Evita propagação de NaN nos cálculos financeiros.
 */
export function safeNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Soma data + meses retornando string YYYY-MM-DD.
 * Retorna fallback (default "") se a data de entrada for inválida.
 */
export function addMonthsISO(dateStr: string | null | undefined, months: number, fallback = ""): string {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return fallback;
  d.setMonth(d.getMonth() + (Number.isFinite(months) ? months : 0));
  if (isNaN(d.getTime())) return fallback;
  return d.toISOString().split("T")[0];
}

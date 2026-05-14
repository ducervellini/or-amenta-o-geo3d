/**
 * Logger que só emite em desenvolvimento.
 * Use no lugar de console.log/warn/error em código de produção
 * para evitar vazar dados sensíveis no console do cliente.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Erros sempre passam — críticos em produção também.
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
};

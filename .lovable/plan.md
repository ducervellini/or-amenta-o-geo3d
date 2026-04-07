

## Diagnose and Fix: Rain Days Calculation Showing 0 Productive Days

### Root Cause

The calculation at line 641:
```
diasProdutivosMes = Math.max(0, diasTrabalho - diasImprodutivosUsuario)
```

When `diasImprodutivosUsuario` >= `diasTrabalho` (24), productive days = 0.

This happens in two scenarios:
1. **Pluviometria auto-fill**: NASA POWER returns `media_dias_chuva_mes` >= 24 (common in tropical/rainy regions like MG), and line 751 sets `diasImprodutivosUsuario = diasChuva` directly
2. **Restore from DB**: `dias_improdutivos / duracaoMeses` produces a value >= `diasTrabalho`

The fundamental problem: **rain days should NOT equal improdutive days 1:1**. Rain days represent days with precipitation, but not all rain days are fully improdutive -- work can still happen during light rain. A conversion factor is needed.

### Plan

#### 1. Fix the auto-fill from pluviometria (src/pages/Mobilizacao.tsx)

When pluviometria data arrives, apply a reasonable cap and conversion:
- Cap `diasImprodutivosUsuario` at a maximum percentage of `diasTrabalho` (e.g., 70%)
- Apply a "fator de improdutividade por chuva" (e.g., 0.5 -- meaning only ~50% of rain days are truly improdutive) so that if NASA says 20 rain days, it becomes ~10 improdutive days
- Show a warning when pluviometria rain days exceed dias_trabalho

#### 2. Fix the restore logic (src/pages/Mobilizacao.tsx)

Add a safety cap when restoring from database:
- Ensure `savedDiasImprodMes` never exceeds `diasTrabalho - 1` (at least 1 productive day)

#### 3. Add validation in the input field

The input already has `max={diasTrabalho}`, but we should also:
- Prevent the value from being set to exactly `diasTrabalho` (would mean 0 productive days)
- Or at minimum show a strong warning when productive days = 0

#### 4. Fix calcularDiasProdutivos in mobilizacao-calculo.ts

The function uses `fator_improdutividade` but the page uses `diasImprodutivosUsuario` directly. The `calcularDiasProdutivos` function result is unused in the actual display -- the real calculation is inline at line 641. This is inconsistent but not the direct bug.

### Files to Edit

| File | Change |
|------|--------|
| `src/pages/Mobilizacao.tsx` (line ~749-751) | Cap pluviometria auto-fill: `min(diasChuva, diasTrabalho - 1)` and apply conversion factor |
| `src/pages/Mobilizacao.tsx` (line ~382-384) | Cap restore: `min(savedDiasImprodMes, diasTrabalho - 1)` |
| `src/pages/Mobilizacao.tsx` (line ~1148) | Cap input max to `diasTrabalho - 1` instead of `diasTrabalho` |

### Technical Detail

The simplest fix is ensuring `diasImprodutivosUsuario` can never equal `diasTrabalho`:
- **Pluviometria auto-fill**: `setDiasImprodutivosUsuario(Math.min(diasChuva, diasTrabalho - 1))`
- **DB restore**: `Math.min(savedDiasImprodMes, diasTrabalho - 1)`  
- **Input max**: change `max={diasTrabalho}` to `max={diasTrabalho - 1}`

This guarantees at least 1 productive day per month. The user can still manually adjust.


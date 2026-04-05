

## Problema

A função `renderDRE` no orçamento usa **nomes** para categorizar componentes, mas a fórmula de preço usa o campo **`categoria`**. Quando há divergência (ou quando perfis antigos sem `categoria` ou sem IRPJ/CSLL são usados), a DRE deduz valores que não foram considerados na formação do preço.

Exemplo concreto: perfis como "BOM PREÇO" e "PADRÃO" não têm IRPJ/CSLL nos componentes. A fórmula de preço calcula `irPct = 0`, mas `renderDRE` injeta IRPJ=4,80% + CSLL=2,88% via fallback, descontando 7,68% que não estavam na receita.

## Plano de Correção

**Arquivo: `src/pages/OrcamentoDetalhe.tsx`**

### 1. Unificar a categorização

Extrair uma função `categorizarComponentes(bdiComponentes)` usada tanto pelo `useMemo` de preço quanto pelo `renderDRE`. A função usará `comp.categoria` quando disponível, com fallback por nome (mesmo padrão).

### 2. Incluir IR na fórmula de preço

Se o perfil BDI não tiver componentes de IR, o fallback de IRPJ+CSLL (7,68%) deve ser adicionado ANTES da fórmula inversa, não apenas na DRE. Assim o denominador passa a ser `1 - tributos% - ir% - lucro%` incluindo o IR default.

### 3. Usar `categoria` em `renderDRE`

Substituir a categorização por nome no `renderDRE` pela mesma função compartilhada, eliminando qualquer chance de divergência.

### Detalhes Técnicos

```text
Antes (pricing):  denom = 1 - tributos - ir(pode ser 0) - lucro
Antes (DRE):      deduz ir = 7.68% (default) mesmo quando pricing não incluiu

Depois: ambos usam a mesma categorização + mesmos defaults
        → preço e DRE sempre alinham
```

**Arquivos editados:** apenas `src/pages/OrcamentoDetalhe.tsx`


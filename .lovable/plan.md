

## Correção da Composição de Processamento GNSS

### Problema Identificado

Os equipamentos da composição "Processamento de dados GNSS" estão com o **coeficiente incorreto**. O sistema não está propagando o coeficiente da Mão de Obra para os equipamentos da mesma composição:

| Item | Coef. Atual | Coef. Correto |
|------|-------------|---------------|
| ANALISTA II (MO) | 1,10 h/un | 1,10 h/un ✓ |
| NOTEBOOK (Equip.) | 1,00 h/un | 1,10 h/un ✗ |
| CELULAR (Equip.) | 1,00 h/un | 1,10 h/un ✗ |

A causa raiz: o `ComposicaoItemForm` declara a prop `existingItems` para herdar o coeficiente da MO, mas essa prop **nunca é passada** pelo `ComposicaoDetalhe.tsx`, e a lógica de herança **não está implementada** no formulário.

### Plano de Correção

**1. Implementar herança de coeficiente no `ComposicaoItemForm.tsx`**
- Quando o tipo de insumo for "equipamento", buscar o coeficiente da primeira MO existente na composição
- Usar esse coeficiente para calcular o custo do equipamento (em vez de usar `periodoEmHoras / quantidade` com horas padrão de 8h)
- Ajustar o `coeficienteCalculado` para equipamentos: usar `horas_diarias` da MO quando disponível

**2. Passar `existingItems` do `ComposicaoDetalhe.tsx`**
- Na chamada ao `ComposicaoItemForm`, adicionar `existingItems={itens}` para que o formulário tenha acesso aos itens existentes

**3. Recalcular itens existentes**
- Ao abrir a composição, recalcular automaticamente os equipamentos cujo coeficiente diverge da MO

### Arquivos Alterados
- `src/components/composicao/ComposicaoItemForm.tsx` — implementar lógica de herança
- `src/pages/ComposicaoDetalhe.tsx` — passar prop `existingItems`


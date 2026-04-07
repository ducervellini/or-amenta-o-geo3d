

## Reverter cálculo de materiais para funcionamento normal na composição

### Problema
Atualmente, materiais na composição exibem "A calcular" e não calculam custo, aguardando a duração do projeto. O usuário quer que materiais sejam calculados normalmente, como mão de obra e equipamentos.

### Alterações

**1. `src/components/composicao/ComposicaoItemForm.tsx`**
- Remover o bloco condicional `tipo === "material"` que simplifica o formulário (linhas 266-283). Materiais passam a usar o mesmo layout de produtividade/período que MO e equipamentos
- Remover o aviso amarelo "custo será calculado após duração do projeto" (linhas 316-321)
- Alterar o `resultado` memo (linhas 194-199): chamar `calcularMaterial(paramsMa, 1, coeficienteCalculado)` normalmente em vez de retornar custo zero
- Alterar o `coeficienteCalculado` memo (linha 185): remover o `if (tipo === "material") return 1`
- Alterar o `handleSubmit` (linhas 208-221): remover as condições `isMaterial` — materiais usam `resultado.custo_unitario` e `coeficienteCalculado` como os demais tipos
- Alterar o resumo do item (linhas 371-401): remover o bloco condicional para material — usar o mesmo layout de produtividade/coeficiente/custo unitário
- Mostrar o bloco de "Cálculo de Produtividade" para materiais também (linha 324)

**2. `src/pages/ComposicaoDetalhe.tsx`**
- Remover as condições que exibem "A calcular" e "—" para materiais (linhas 106-111). Exibir custo e coeficiente normalmente como os outros tipos

### Resultado
Materiais terão o mesmo fluxo de cálculo: o usuário informa produtividade e período, o sistema calcula o coeficiente e o custo unitário com base nos parâmetros do material (perda, reaproveitamento, reposição).


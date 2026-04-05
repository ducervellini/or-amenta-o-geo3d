
Objetivo: corrigir a causa real da divergência para que, se no BDI & DRE o lucro líquido desejado for 20%, o orçamento também feche em 20% da receita.

Diagnóstico
- O erro já não está só na DRE do orçamento; agora o problema principal é a formação do preço.
- Em `src/pages/BdiDre.tsx`, o cálculo em tempo real usa a fórmula inversa e chega a um `Preço de Venda` correto (`resultado.receitaBruta`) e a um BDI efetivo correto (`resultado.bdiResultante`).
- Porém, ao salvar, a tela grava em `parametros_bdi.bdi_calculado` o valor `resultado.bdiPercent`, que é o “BDI da fórmula”, não o markup efetivo usado para formar o preço.
- Em `src/pages/OrcamentoDetalhe.tsx`, o orçamento usa exatamente esse `bdi_calculado` salvo para fazer:
  - `valorBdi = custoTotal * (bdiPercentual / 100)`
  - `precoTotal = custoTotal + valorBdi`
- Resultado: o orçamento passa a usar um preço menor do que o preço realmente calculado na tela BDI & DRE, e por isso o lucro líquido cai para algo como 7,14% em vez de 20%.

Arquivos impactados
- `src/pages/BdiDre.tsx`
- `src/pages/OrcamentoDetalhe.tsx`
- `src/lib/bdi-calculo.ts` (ou novo helper compartilhado, seguindo o padrão já existente)

Plano de correção
1. Unificar a lógica de formação de preço
- Extrair para função compartilhada o cálculo que hoje existe em `BdiDre.tsx`.
- Essa função deve receber custo + componentes do BDI e retornar:
  - preço de venda correto
  - BDI efetivo
  - tributos, IR, despesas e lucro líquido
- Assim BDI & DRE e Orçamento passam a usar exatamente a mesma conta.

2. Corrigir o valor oficial salvo do BDI
- Em `BdiDre.tsx`, deixar de salvar `resultado.bdiPercent` como valor principal usado pelo orçamento.
- Passar a salvar como `bdi_calculado` o BDI efetivo (`resultado.bdiResultante`), que é o percentual realmente compatível com o preço de venda calculado.
- O “BDI da fórmula” pode continuar sendo exibido só como informação auxiliar na própria tela, sem ser a base do orçamento.

3. Corrigir a formação do preço no orçamento
- Em `OrcamentoDetalhe.tsx`, parar de depender apenas do `bdi_calculado` cru para formar o preço.
- Recalcular `precoTotal` e `bdiPercentual` a partir dos componentes do BDI usando a mesma função compartilhada.
- Isso garante compatibilidade inclusive com perfis antigos, desde que tenham os componentes salvos.

4. Manter a DRE do orçamento alinhada ao preço correto
- Depois de corrigir a origem do `precoTotal`, manter a DRE já ajustada:
  - tributos e IR sobre a receita
  - despesas indiretas e risco sobre o custo
  - lucro líquido como resultado residual correto
- Com isso, o percentual final exibido deixa de ser 7,14% e passa a refletir o alvo configurado.

5. Atualizar persistência do orçamento
- Ao salvar o orçamento, gravar `bdi_percentual` e `preco_total` já recalculados pela lógica unificada.
- Isso evita que resumos e listagens futuras usem valores inconsistentes.

Detalhes técnicos
- Causa raiz:
  - `BdiDre.tsx` salva `resultado.bdiPercent`
  - `OrcamentoDetalhe.tsx` usa `bdiData?.bdi_calculado` para formar o preço
  - mas o preço correto da DRE vem de `resultado.receitaBruta`, cujo markup real é `resultado.bdiResultante`
- Em outras palavras: hoje o sistema salva um percentual e usa outro cálculo para mostrar o preço.
- A correção precisa alinhar “o que é salvo”, “o que é mostrado” e “o que o orçamento usa”.

Validação esperada
- Com lucro líquido desejado de 20% no BDI & DRE:
  - o preço de venda no BDI & DRE e no orçamento deve ser o mesmo
  - a DRE do orçamento deve mostrar 20,00% da receita no lucro líquido
  - o BDI salvo e reaproveitado deve corresponder ao markup efetivo do preço, não apenas ao indicador interno da fórmula

Observação
- Não vejo necessidade de mudança de banco para isso; a correção é de regra de negócio e reaproveitamento consistente dos componentes já salvos.



## Problema Identificado

A DRE no Orçamento (`OrcamentoDetalhe.tsx`) calcula tributos, lucro e despesas **sobre o custo direto**, quando deveriam ser calculados **sobre a receita bruta (preço de venda)**. Isso causa uma divergência enorme com a DRE da página BDI & DRE.

### Detalhes técnicos

Na página **BDI & DRE** (`BdiDre.tsx`), o cálculo é correto:
- Usa fórmula inversa: `Receita = (CD + Despesas) / (1 - Tributos% - IR% - Lucro%)`
- Tributos e IR são calculados sobre a receita bruta
- Lucro líquido resulta corretamente no percentual desejado

Na página **Orçamento** (`OrcamentoDetalhe.tsx`, função `renderDRE`), o cálculo está errado:
- Linha 1091: `totalTributos = custoTotal × tributos%` (deveria ser `precoTotal × tributos%`)
- Linha 1094: `valorLucro = custoTotal × lucro%` (deveria ser `precoTotal × lucro%`)
- Linha 1093: `totalDespInd = custoTotal × despesas%` (deveria ser `custoTotal × despesas%` — este está correto pois despesas incidem sobre custo)
- Linha 1095: `valorRisco = custoTotal × risco%` (correto, incide sobre custo)
- O preço é calculado simplesmente como `custoTotal × (1 + BDI%)`, mas a DRE não reflete a mesma lógica

### Plano de Correção

**Arquivo: `src/pages/OrcamentoDetalhe.tsx`**

1. **Corrigir cálculos na função `renderDRE`** (linhas 1090-1099):
   - Tributos sobre receita: calcular sobre `precoTotal` em vez de `custoTotal`
   - Lucro bruto: calcular sobre `precoTotal` em vez de `custoTotal`
   - Manter despesas indiretas e risco sobre `custoTotal` (correto)
   - Recalcular lucro líquido consistentemente: `Receita - Tributos - CustoTotal - Despesas - IR`

2. **Alinhar a lógica com a fórmula BDI multiplicativa** usada em `BdiDre.tsx`:
   - Receita Bruta = `precoTotal`
   - (-) Tributos sobre receita = `precoTotal × tributosPct%`
   - = Receita Líquida
   - (-) Custo Direto Total
   - = Lucro Bruto
   - (-) Despesas indiretas = `custoTotal × despesasPct%`
   - (-) Risco = `custoTotal × riscoPct%`
   - = Lucro antes IR (EBIT)
   - (-) IRPJ/CSLL = `precoTotal × irPct%`
   - = Lucro Líquido

Isso fara com que o lucro liquido no orcamento reflita o percentual configurado na pagina BDI & DRE.


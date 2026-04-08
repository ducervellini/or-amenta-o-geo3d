

## Relatório de Exequibilidade com Memória de Cálculo

### Situação Atual

O sistema já possui um relatório imprimível no Orçamento (via `print:block`) que inclui:
- Dados da oportunidade
- Serviços com quantidades e subtotais
- ADM Local
- BDI e DRE

**O que falta**: o detalhamento das composições com a **memória de cálculo** de cada insumo (mão de obra, equipamentos, materiais), que é essencial para demonstrar exequibilidade.

### O que será criado

Um botão "Relatório de Exequibilidade" na tela de Orçamento que gera uma versão impressa completa, incluindo:

1. **Capa** com dados da oportunidade, cliente, local e data
2. **Resumo executivo** com preço de venda, custo total e margem
3. **Para cada composição do orçamento**:
   - Nome, código e unidade do serviço
   - Tabela de insumos com tipo, descrição, quantidade, coeficiente, custo unitário e custo total
   - **Memória de cálculo detalhada** de cada insumo (fórmulas passo a passo como já existe no componente `MemoriaCalculo`)
   - Resumo por categoria (MO, Equipamentos, Materiais)
4. **ADM Local** detalhado (hospedagem, veículos, equipes, combustível)
5. **BDI** com todos os componentes e a fórmula aplicada
6. **DRE** completo (já existente, será incorporado)

### Alterações técnicas

| Arquivo | Mudança |
|---------|---------|
| `src/pages/OrcamentoDetalhe.tsx` | Expandir o bloco `print-report` para incluir seção de composições detalhadas com memória de cálculo. Buscar `composicao_itens` de cada composição e recalcular resultados usando as funções de `composicao-calculo.ts`. Adicionar botão "Relatório de Exequibilidade" |
| `src/index.css` | Adicionar estilos de impressão para a memória de cálculo (fonte menor, layout compacto) |

### Fluxo

1. Usuário abre o orçamento
2. Clica em "Relatório de Exequibilidade"
3. O sistema carrega os itens de todas as composições vinculadas
4. Recalcula cada insumo usando `calcularMaoDeObra`, `calcularEquipamento`, `calcularMaterial`
5. Renderiza o relatório completo em `print:block`
6. Aciona `window.print()` para gerar PDF

### Exemplo do que será exibido por composição

```text
┌──────────────────────────────────────────────────────┐
│ COMPOSIÇÃO: LEV-001 — Levantamento Topográfico       │
│ Unidade: km                                           │
├──────────────────────────────────────────────────────┤
│ INSUMO: Topógrafo (Mão de Obra)                      │
│                                                       │
│ Salário base mensal (CLT)............ R$ 4.500,00    │
│ Encargos sociais..................... R$ 3.285,00    │
│ Custo mensal total................... R$ 8.285,00    │
│ Horas úteis/mês...................... 176 h          │
│ Custo por hora....................... R$ 47,07       │
│ Fator regime operacional............. 1,1667         │
│ Custo hora c/ regime................. R$ 54,92       │
│ Custo unitário (1 km)................ R$ 439,34      │
│                                                       │
│ INSUMO: Marco de Aço Galvanizado (Material)          │
│ Custo unitário base.................. R$ 25,00       │
│ Quantidade por unidade............... 10 un/km       │
│ Custo total por km................... R$ 250,00      │
├──────────────────────────────────────────────────────┤
│ RESUMO: MO R$ 439,34 | Mat R$ 250,00 | Total R$ ... │
└──────────────────────────────────────────────────────┘
```


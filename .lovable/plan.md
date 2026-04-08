

## Criar Menu "Custos de Serviços"

### Objetivo
Novo menu entre "Oportunidades" e "ADM Local" na sidebar. Permite selecionar uma oportunidade, definir quantidades para cada composição vinculada, calcular custos de serviços (MO + Equip + Material) e organizar com drag-and-drop e subtítulos.

### Arquitetura

A tabela `orcamento_itens_servico` já armazena `composicao_id`, `quantidade`, `custo_unitario` e `custo_total` vinculados a um `orcamento_id`. Vamos reutilizar essa estrutura, criando/atualizando o orçamento automaticamente ao selecionar a oportunidade.

### Alterações

**1. Nova página `src/pages/CustosServicos.tsx`**
- Seletor de oportunidade no topo (dropdown com código + descrição)
- Ao selecionar, carrega composições do grupo de serviços da oportunidade
- Tabela com colunas: Código, Nome, Unidade, Qtd (input editável), Custo Unit., Custo Total
- Breakdown por tipo de insumo (MO, Equipamento, Material) usando `composicao_itens`
- Suporte a drag-and-drop (reordenação) e inserção de subtítulos usando `useRowOrdering` com tabela "custos_servicos"
- Salva automaticamente (debounced) em `orcamento_itens_servico` criando/atualizando o orçamento associado
- Totalizador no rodapé

**2. Atualizar `src/App.tsx`**
- Importar `CustosServicos` e adicionar rota `/custos-servicos`

**3. Atualizar `src/components/layout/AppSidebar.tsx`**
- Adicionar item "Custos de Serviços" com ícone `DollarSign` entre "Oportunidades" e "ADM Local"

**4. Atualizar `src/pages/OrcamentoDetalhe.tsx`**
- Step "Serviços": exibir composições e quantidades como read-only (sem inputs editáveis), puxando dados de `orcamento_itens_servico`

### Fluxo do Usuário
1. Acessa "Custos de Serviços"
2. Seleciona oportunidade
3. Sistema carrega composições do grupo de serviços vinculado
4. Usuário insere quantidades, organiza linhas com drag-and-drop, cria subtítulos
5. Custos são calculados em tempo real e salvos automaticamente
6. No menu "Orçamentos", os serviços aparecem somente leitura

### Detalhes Técnicos
- Queries: reutilizar padrão existente com `useQuery` para oportunidades, composições e `composicao_itens`
- Cálculo: `custo_total = quantidade × custo_unitario_total` por composição; breakdown por `tipo_insumo` dos `composicao_itens`
- Persistência: upsert em `orcamento_itens_servico` via debounce de 500ms
- Ordenação: `useRowOrdering("custos_servicos_<oportunidade_id>", data)`


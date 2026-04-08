

## Cálculo Automático de Duração de Serviços de Campo

### Diagnóstico

A lógica de cálculo já existe no ADM Local (`Mobilizacao.tsx`, linhas 418-498) e o painel "Prazo de Campo por Serviço" (linhas 2042-2109) também. Porém, o sistema depende do campo `produtividade_padrao` na tabela `servicos`, que **não está exposto no formulário de cadastro de Serviços** — logo nunca é preenchido e o painel nunca aparece.

### Abordagem Recomendada

A melhor forma é uma abordagem em duas camadas:

1. **Produtividade definida no cadastro do Serviço** (valor padrão da empresa)
2. **Produtividade ajustável por composição** (override por projeto, já existe parcialmente no `composicao_itens.parametros`)

O cálculo segue: `Dias de Campo = Quantidade / Produtividade diária`, onde a produtividade diária é convertida da unidade cadastrada (hora, dia ou mês).

### Alterações

**1. Adicionar campos de produtividade no cadastro de Serviços (`src/pages/cadastros/Servicos.tsx`)**
- Campo `produtividade_padrao` (numérico) — ex: 3.5
- Campo `unidade_tempo_produtividade` (select: hora/dia/mês) — ex: "km/dia"
- Campo `tipo_geometria` (select: area/linha/ponto) — para referência
- Exibir na tabela de listagem a coluna "Produtividade"

**2. Melhorar o painel de cálculo no ADM Local (`src/pages/Mobilizacao.tsx`)**
- Mostrar o painel mesmo quando produtividade é zero, com aviso "Defina a produtividade no cadastro de Serviços"
- Adicionar coluna "Produtividade (un/dia)" na tabela de breakdown
- Mostrar fórmula completa: `Quantidade ÷ Produtividade = Dias → Meses`
- Incluir link direto para o cadastro de Serviços quando faltar produtividade

**3. Usar produtividade da composição como override (se existir)**
- Na lógica de cálculo, verificar se a composição tem `parametros.produtividade` definido
- Se sim, usar esse valor ao invés do `produtividade_padrao` do serviço
- Isso permite ajustar por projeto sem alterar o cadastro mestre

### Fluxo Final
1. Usuário cadastra serviços com produtividade padrão (ex: Topografia = 3 km/dia)
2. Em Custos de Serviços, define quantidades (ex: 150 km)
3. No ADM Local, o sistema calcula automaticamente: 150 ÷ 3 = 50 dias → ~2.5 meses
4. O painel lateral mostra o breakdown por serviço, e o campo Duração é preenchido automaticamente com o maior prazo

### Detalhes Técnicos
- Nenhuma migração de banco necessária (campos `produtividade_padrao`, `unidade_tempo_produtividade` e `tipo_geometria` já existem na tabela `servicos`)
- Arquivos editados: `src/pages/cadastros/Servicos.tsx`, `src/pages/Mobilizacao.tsx`


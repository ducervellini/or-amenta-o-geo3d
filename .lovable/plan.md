
# Análise e Plano: Fluxo Oportunidade → Orçamento + Cronograma

## 1. Pontos críticos identificados no fluxo atual

### 1.1 Dois caminhos paralelos fazendo a mesma coisa (raiz da fricção)
- **Caminho A** — `/oportunidades`: cada linha tem 3 atalhos (💲 Custos, 🏢 ADM, 🧮 BDI) que **navegam para fora** (`/custos-servicos?oportunidade=…`, `/mobilizacao?…`, `/bdi?…`).
- **Caminho B** — `/orcamentos` → `/orcamentos/:id` (OrcamentoDetalhe): wizard de 4 passos (Oportunidade → Serviços → ADM Local → BDI & Preço). Cada passo é **somente leitura** e tem um botão "Editar em página separada" que joga o usuário no mesmo `/custos-servicos`, `/mobilizacao`, `/bdi` do caminho A.
- Resultado: o usuário **abre o orçamento, sai para editar, volta, sai de novo**. O wizard só consolida — não economiza cliques, duplica o trabalho.

### 1.2 OportunidadeGate redundante
- `OportunidadeGate` é montado em `CustosServicos`, `Mobilizacao`, `BDI` — cada um faz a sua própria query `gate-oportunidades` e força reselect se o `?oportunidade=` se perde na navegação entre abas do navegador.
- Quando o usuário vem de OrcamentoDetalhe (já com `id`), o gate aparece desnecessariamente porque a URL muda de `/orcamentos/:id` para `/custos-servicos?oportunidade=:id` — contexto perdido, novo fetch.

### 1.3 OrcamentoDetalhe = 1647 linhas, 8+ queries, refetch agressivo
- Queries em cascata: oportunidade → grupo → serviços → composições → itens; cada navegação entre tabs perde dados in-flight.
- `queryKey` de `composicaoItens` usa string concatenada de IDs (`.join(",")`) — qualquer mudança de quantidade refaz tudo.
- Nenhum `prefetch` entre passos.

### 1.4 Inconsistência de status / progresso
- Status de orçamento é computado **3 vezes** com regras diferentes:
  - `Orcamentos.getStatus` (lista) — exige `temServicos && temMob && temBdi && temGrupo`.
  - OrcamentoDetalhe — passos próprios.
  - Oportunidades — sem status.
- Não existe indicador único "% concluído" que oriente o usuário sobre o próximo passo.

### 1.5 Falta de prefetch e Suspense entre etapas
- Trocar de aba dispara loading visível sempre. Não há `placeholderData` nem `staleTime` configurados — todo retorno à etapa recarrega.

### 1.6 Cronograma — só existe no DOCX
- `relatorio-exequibilidade-docx.ts:377` já calcula um cronograma simples (qtd ÷ produtividade), mas **não há tela**, **não persiste**, **não separa campo/escritório** apesar de `cargos.local_trabalho` já existir.
- Sem cronograma visível, o usuário não enxerga o impacto da quantidade × produtividade no prazo, nem casa com a duração da Mobilização.

---

## 2. Plano de implementação (4 frentes, ordem sugerida)

### Frente A — Unificar o fluxo num único shell editável  *(remove a maior parte da fricção)*

**Objetivo**: tornar `/orcamentos/:id` o único local de trabalho. Custos, ADM Local e BDI passam a ser **abas embarcadas e editáveis** dentro do shell, não páginas separadas.

Passos:
1. Refatorar `OrcamentoDetalhe.tsx` em um **shell** (cabeçalho + steps + footer) que renderiza componentes-tab.
2. Extrair o conteúdo editável de `CustosServicos.tsx`, `Mobilizacao.tsx` e `BdiDre.tsx` em componentes reutilizáveis (`<CustosServicosPanel oportunidadeId/>`, `<MobilizacaoPanel/>`, `<BdiPanel/>`).
3. As páginas standalone (`/custos-servicos`, `/mobilizacao`, `/bdi`) continuam existindo mas viram **wrappers finos** sobre os mesmos panels + `OportunidadeGate` — sem código duplicado.
4. Em `/oportunidades`, substituir os 3 ícones (💲🏢🧮) por **um único botão "Abrir Orçamento"** que vai direto para `/orcamentos/:id` na aba correta (querystring `?step=servicos|adm|bdi`).
5. Em `OrcamentoDetalhe`, remover os botões "Editar em página separada" — agora tudo é inline.

### Frente B — Indicador único de progresso + navegação inteligente

1. Criar helper `lib/orcamento-status.ts` com função única `calcularProgressoOrcamento(opId)` que retorna `{ percentual, proximoPasso, pendencias[] }`.
2. Usar o mesmo helper em `Orcamentos` (lista) e em `OrcamentoDetalhe` (header).
3. No shell, o botão "Próximo" pula automaticamente para a primeira etapa incompleta.
4. Adicionar um banner discreto "Próximo passo: configurar BDI" no topo de cada etapa concluída.

### Frente C — Otimização de queries

1. Criar um único hook `useOrcamentoBundle(oportunidadeId)` que retorna `{ oportunidade, composicoes, mobilizacao, bdiProfiles }` numa **única RPC** (`get_orcamento_bundle`) — economiza ~6 round-trips.
2. Configurar `staleTime: 30_000` e `placeholderData: keepPreviousData` em todas as queries do bundle para eliminar flash de loading entre tabs.
3. Trocar `queryKey` baseada em `servicos.map(...).join(",")` por chave estável (`["composicao-itens", composicaoIdsStable]` ordenado e memoizado).
4. Adicionar `queryClient.prefetchQuery` ao passar o mouse sobre cada step.

### Frente D — Módulo Cronograma (Campo × Escritório)

**Modelo de cálculo** (sem necessidade de nova tabela inicial — derivado):

```text
Para cada item de serviço do orçamento:
  qtd               = orcamento_itens_servico.quantidade
  prod_dia          = servicos.produtividade_padrao  (convertida p/ qtd-por-dia
                       usando unidade_tempo_produtividade + jornada da mobilização)
  num_equipes       = 1 (default; editável)
  dias_brutos       = ceil(qtd / (prod_dia * num_equipes))
  dias_efetivos     = dias_brutos * (1 + fator_improdutividade)   (vem da Mobilização)

Classificação Campo/Escritório:
  Para cada composicao_itens onde tipo_insumo='mao_de_obra':
    cargo.local_trabalho = 'campo'        -> contribui para horas_campo
    cargo.local_trabalho = 'escritorio'   -> contribui para horas_escritorio
  Proporção campo/escritório por serviço = horas_campo / (horas_campo + horas_escritorio)
  Duração_campo       = dias_efetivos * proporção_campo
  Duração_escritório  = dias_efetivos * proporção_escritório  (executa em paralelo)
```

UI:
1. Nova aba **"Cronograma"** no shell `OrcamentoDetalhe` (5ª etapa, entre ADM e BDI).
2. Componente `<CronogramaServicos>`:
   - Tabela: serviço | qtd | produtividade | nº equipes (editável) | dias campo | dias escritório | data início | data fim.
   - Gantt simples (barras CSS) com dois trilhos por linha: 🟦 Campo, 🟨 Escritório.
   - Totalizador no rodapé: total de meses, comparação com `mobilizacao.duracao_meses` (alerta se divergir).
3. Botão "Aplicar à Mobilização" — atualiza `mobilizacao.duracao_meses` com o resultado do cronograma (mantém coerência ADM Local ↔ cronograma).
4. Persistência mínima: nova tabela `orcamento_cronograma_itens` apenas para os overrides do usuário (nº equipes, data início customizada, dependências) — o resto é calculado.
5. Exportar o mesmo cronograma no DOCX existente (substituir o cálculo atual de `relatorio-exequibilidade-docx.ts:377` pelo helper compartilhado).

---

## 3. Detalhes técnicos (referência)

- Arquivos principais a tocar: `src/pages/OrcamentoDetalhe.tsx`, `src/pages/Oportunidades.tsx`, `src/pages/CustosServicos.tsx`, `src/pages/Mobilizacao.tsx`, `src/pages/BdiDre.tsx`, `src/components/orcamento/OportunidadeGate.tsx`.
- Novos: `src/components/orcamento/panels/{CustosServicosPanel,MobilizacaoPanel,BdiPanel,CronogramaPanel}.tsx`, `src/lib/orcamento-status.ts`, `src/lib/cronograma-calculo.ts`, `src/hooks/useOrcamentoBundle.ts`.
- Migração necessária só na Frente D: tabela `orcamento_cronograma_itens` (id, orcamento_id, composicao_id, num_equipes, data_inicio_override, ordem, ativo) com RLS por `has_role`.
- Edge function RPC `get_orcamento_bundle` (Frente C) — opcional; pode-se manter as queries individuais com `staleTime` se preferir simplicidade.

## 4. Ordem de execução sugerida

1. **Frente A** (maior ganho de fluidez percebido) — 1 entrega.
2. **Frente B** (orienta o usuário no novo shell) — 1 entrega.
3. **Frente D** (cronograma) — 1 entrega.
4. **Frente C** (otimização fina) — última, opcional/incremental.

Posso começar pela Frente A já no próximo turno.

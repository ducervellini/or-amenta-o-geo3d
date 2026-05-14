## Parte 1 de 3 — Hooks e Lib

Criar 6 arquivos novos (sobrescrevendo se existirem) com o conteúdo já validado pelo usuário em 141 testes unitários. Não modificar o código fornecido.

### Arquivos a criar

1. **`src/lib/admin-local-calculo.ts`** — Lógica de cálculo de Admin Local (Sprint 4): tipos de bloco/escala, função `calcularItemAdminLocal`, totalização por bloco, conversão dias↔meses.

2. **`src/lib/formula-quantidade.ts`** — Avaliador TypeScript de fórmulas de quantidade (paridade com função SQL `avaliar_formula_quantidade`): whitelist de variáveis e funções, `validarFormula` e `avaliarFormula`.

3. **`src/hooks/useAdminLocal.ts`** — Hooks React Query para categorias e itens de admin local de um orçamento, agrupamento por bloco, mutations CRUD, aplicação de templates e busca de admin central vigente.

4. **`src/hooks/useOrcamentoTemplates.ts`** — Hooks para variações de serviço, parâmetros do orçamento e templates de orçamento, incluindo RPC `aplicar_template_orcamento`.

5. **`src/hooks/useCustoCargo.ts`** — Hook que busca cargo + jornada + regime + almoço + encargos + benefícios e calcula custo total mensal/dia/hora via `calcularCustoDetalhado`.

6. **`src/hooks/useBenchmark.ts`** — Hooks para views de benchmark histórico (`v_orcamentos_benchmark`, `v_benchmark_distribuicao_tipo_obra`) e RPC `buscar_orcamentos_similares`.

### Após criar os arquivos

- Regenerar os tipos do Supabase (cliente/types.ts) para que as novas tabelas (`admin_local_categorias`, `admin_local_itens`, `admin_local_templates`, `servico_variacoes`, `orcamento_parametros`, `orcamento_templates`, views e RPCs) fiquem tipadas.
- Não rodar testes (já validados pelo usuário).
- Garantir que o build TypeScript compila — corrigir apenas erros de tipagem causados pela ausência das novas tabelas/views nos types regenerados, sem alterar a lógica.

### Confirmação

Ao final, responder exatamente: **"Parte 1 concluída"**.

### Observações técnicas

- As tabelas `admin_local_categorias`, `admin_local_itens`, `admin_local_templates` já existem no schema (vistas no contexto). As demais (`servico_variacoes`, `orcamento_parametros`, `orcamento_templates`, views `v_orcamentos_benchmark` e `v_benchmark_distribuicao_tipo_obra`, RPCs `aplicar_template_orcamento`, `buscar_orcamentos_similares`, `get_admin_central_percentual`) precisam existir no banco para os tipos serem regenerados corretamente. Se algumas ainda não existirem, os hooks usam `as never` casts que fazem o build passar mesmo sem tipagem.

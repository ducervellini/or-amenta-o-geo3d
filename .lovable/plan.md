
# Revisão — Fase 1 BDI/CCU (script otimizado)

Confirmei que todas as tabelas referenciadas existem no banco (`parametros_bdi`, `parametros_bdi_componentes`, `oportunidades`, `parametros_tributos`, `orcamentos`, `encargos_sociais`). Só falta criar `parametros_logistica_regional`.

## O que cada prompt faz

### Prompt A — Migration consolidada + types
- `orcamentos.metodologia_calculo_versao` (`v1_legado` default → preserva orçamentos atuais).
- Enum `bdi_metodologia` (`simplificado` | `tcu_2622`) + coluna em `parametros_bdi`.
- `parametros_bdi_componentes.codigo_tcu` (AC, S, G, R, DF, L, IT_*).
- Enum `regime_tributario_especial` + coluna em `oportunidades` (padrão/REIDI/Simples/MEI/isento).
- `parametros_tributos`: flags `aplicavel_reidi/simples/mei`; seed PIS+COFINS como REIDI.
- `encargos_sociais.tipo_grupo` + seed de 12 encargos CLT padrão (INSS, FGTS, 13º, férias etc.) com `WHERE NOT EXISTS`.
- Nova tabela `parametros_logistica_regional` (UF × bioma × fatores de rota/chuva/velocidade) + seed dos 27 estados.
- Cria `src/types/calculo-v2.ts`. **Não toca em UI.**

### Prompt B — Calculadores corrigidos (`src/lib/calculos-v2.ts`)
- `aplicarFatorUtilizacao`: v2 **divide** (custo/fu) em vez de multiplicar — corrige distorção.
- `calcularBDITCU2622`: fórmula oficial TCU `((1+AC+S+G+R)(1+DF)(1+L)/(1-IT)) − 1`.
- `percentualEfetivoTributo`: zera tributo conforme regime (REIDI/Simples/MEI).
- `obterParametrosRegionais`: lê `parametros_logistica_regional` com cache.
- Refatora `composicao-calculo.ts` (equipamento/veículo) para receber metodologia.
- `OrcamentoDetalhe.tsx`: roteia entre BDI simplificado e TCU; aplica regime tributário.
- Edge `calcular-rota` e `mobilizacao-calculo.ts`: troca 1.30 e 0.50 hardcoded por valores regionais.

### Prompt C — UI mínima
1. Etapa BDI: Toggle simplificado/TCU + validação de `codigo_tcu`; Alert "Recalcular como v2" para orçamentos v1.
2. Form Oportunidade: Select `regime_tributario` + tooltip REIDI.
3. Tela Encargos: botão "Aplicar pacote padrão CLT".
4. Cargos: mostrar K total (% encargos) + warning se K < 60%.
5. Mobilização: usar `fator_chuva_produtividade` regional em vez de 0.5.

### Prompt D — Testes vitest (`calculos-v2.test.ts`)
8 casos críticos: fator utilização (v1 vs v2, clamp), BDI TCU (faixa 25–35%, rejeita IT≥1 e CD<0), regime tributário (REIDI zera PIS).

## Pontos de atenção / divergências do nosso projeto

1. **`src/pages/oportunidade/[id].tsx`** — não existe; oportunidades vivem em `src/pages/Oportunidades.tsx`. Vou aplicar lá.
2. **`src/pages/Encargos.tsx` e `Cargos.tsx`** — temos `src/pages/cadastros/EncargosSociais.tsx` e `cadastros/Cargos.tsx`. Vou usar esses caminhos.
3. **`snapshot_versao`** — o prompt C menciona criar novo snapshot ao recalcular; o sistema atual usa `composicao_revisoes`/`historico_aprendizado`, sem `snapshot_versao` em `orcamentos`. Proponho gravar entrada em `historico_aprendizado` com diff de preço (sem criar coluna nova).
4. **`composicao-calculo.ts`** — hoje não recebe `metodologia` nem `orcamento`. A assinatura mudará para receber `metodologia: MetodologiaCalculoVersao`; quem chama (CustosServicos, OrcamentoDetalhe, MemoriaCalculo) precisará passar `orcamento.metodologia_calculo_versao`. Orçamentos antigos continuam em `v1_legado` → comportamento idêntico.
5. **Edge `calcular-rota`** — vai precisar receber UF/bioma do orçamento ou buscar via PostGIS/lookup; o prompt assume que UF está disponível. Vou ler UF de `mobilizacoes.estado`.
6. **Branch git** — não tenho controle de git; ignoro a instrução "criar branch".
7. **CHANGELOG.md** — não existe; posso criar ao final do D.
8. **Sem refactor extra** — vou seguir à risca, sem polimento fora de escopo.

## Execução proposta

Quatro entregas separadas, parando para você revisar entre elas:
- **A**: migration (você aprova SQL) + types.
- **B**: `calculos-v2.ts` + wiring nos calculadores e edge.
- **C**: 5 mudanças de UI.
- **D**: testes + CHANGELOG.

Aprove para começar pelo Prompt A (migration), ou peça ajustes nos pontos 1–8 acima.

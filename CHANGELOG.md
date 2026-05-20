# CHANGELOG

Todas as mudanças notáveis deste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased] — Fase 1 BDI/CCU

### Adicionado
- **Metodologias de cálculo versionadas** — coluna `orcamentos.metodologia_calculo_versao`
  (`v1_legado` | `v2_corrigido`, default `v1_legado` para preservar orçamentos
  existentes).
- **BDI TCU 2622/2013** — coluna `parametros_bdi.metodologia`
  (`simplificado` | `tcu_2622`) + `parametros_bdi_componentes.codigo_tcu`
  (AC/S/G/R/DF/L/IT_*).
- **Regimes tributários especiais** — coluna `oportunidades.regime_tributario`
  (`padrao` | `reidi` | `simples_nacional` | `mei` | `isento_municipio`) com
  flags `aplicavel_reidi/simples/mei` em `parametros_tributos` (PIS/COFINS
  seedados como REIDI).
- **Encargos sociais agrupados** — coluna `encargos_sociais.tipo_grupo`
  (`previdenciario`/`salarial`/`rescisorio`/`beneficio`/`outros`) + seed de 13
  encargos padrão CLT (Grupos A/B/C/D + benefícios).
- **Parâmetros logísticos regionais** — nova tabela
  `parametros_logistica_regional` (UF × bioma × fatores de rota/chuva/velocidade)
  populada para os 27 estados, com RLS habilitada.
- **Tipos compartilhados** — `src/types/calculo-v2.ts`
  (`MetodologiaCalculoVersao`, `BdiMetodologia`, `RegimeTributario`, `Bioma`,
  `TipoVia`, `CodigoTCU`).
- **Calculadores corrigidos** — `src/lib/calculos-v2.ts`:
  - `aplicarFatorUtilizacao` (v1 multiplica × v2 divide pelo FU).
  - `calcularBDITCU2622` — fórmula oficial
    `((1+AC+S+G+R)(1+DF)(1+L)/(1-IT)) − 1`.
  - `percentualEfetivoTributo` — zera tributos conforme regime especial.
  - `obterParametrosRegionais` — lookup com cache em memória.
- **UI mínima de Fase 1**:
  - `PainelBDI`: toggle Simplificado/TCU 2622 + alerta “Recalcular como v2”
    quando orçamento ainda está em `v1_legado`.
  - `Oportunidades`: select de `regime_tributario` com descrição inline.
  - `EncargosSociais`: botão “Aplicar pacote padrão CLT” (idempotente) +
    coluna `tipo_grupo`.
  - `Cargos`: warning quando K total de encargos < 60% (mínimo CLT).
  - `Mobilizacao`: passa a usar `fator_chuva_produtividade` regional em vez
    do `0.5` hardcoded.
- **Testes vitest** — `src/lib/calculos-v2.test.ts` cobrindo 15 casos críticos
  (FU v1 × v2, clamp, BDI TCU em faixa 25–35%, rejeição de IT ≥ 1 e CD < 0,
  regimes REIDI/Simples/MEI).

### Alterado
- Edge function `calcular-rota` agora lê `fator_rota_rodovia_federal` e
  `velocidade_media_kmh` regionais (fallback `1.30` / `80 km/h` mantido se a
  UF não estiver cadastrada).
- `composicao-calculo.ts`: `calcularEquipamento` e `calcularVeiculo` passam a
  aceitar `metodologia?: MetodologiaCalculoVersao`. Default `v1_legado`
  preserva 100 % do comportamento atual.

### Notas de migração
- Orçamentos existentes permanecem em `v1_legado` — nenhum preço muda
  automaticamente. Para migrar um orçamento, basta atualizar
  `metodologia_calculo_versao = 'v2_corrigido'` e recalcular.
- O toggle TCU no `PainelBDI` é apenas de simulação enquanto o orçamento
  permanecer `v1_legado` (mostrado em alerta dedicado).

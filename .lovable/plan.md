

## Regenerar DOCX e XLSX com Vinculação Direta e Ajuste de Planialtimétrico

### Problema Atual
Os arquivos anteriores distribuíam valores proporcionalmente sem vínculo direto entre as composições do DOCX e os itens do XLSX. Além disso, o preço unitário do Levantamento Planialtimétrico (R$ 757/km com BDI) fica abaixo da referência CREA-SP Classe I N (R$ 1.067,96/km).

### Dados do Orçamento (banco atual)

| Dado | Valor |
|------|-------|
| Custo Serviços | R$ 4.538.260,87 |
| ADM Local | R$ 974.220,00 |
| Custo Total (CD) | R$ 5.512.480,87 |
| BDI | 59,18% |
| Preço Total | R$ 8.775.000 |

### Agrupamento das 14 Composições em 6 Itens do Edital

```text
ITEM 1 - Topografia e Georreferenciamento
  → Lev. Planialtimétrico (5.000 km × R$ 475,67)    = R$ 2.378.358
  → Coleta Pontos Apoio (200 pts × R$ 218,46)        = R$    43.692
  → Processamento GNSS (150 un × R$ 379,40)          = R$    56.910
                                              Subtotal = R$ 2.478.960

ITEM 2 - Plantas e SIGEF
  → Planta Geral (7 un × R$ 991,50)                  = R$     6.941
  → Planta/Memorial SIGEF (1.000 un × R$ 376,04)     = R$   376.038
  → Cadastro SIGEF (1.000 prop × R$ 278,99)          = R$   278.998
                                              Subtotal = R$   661.977

ITEM 3 - Aerolevantamento
  → Drone Asa Fixa (35.500 ha × R$ 4,36)             = R$   154.627
  → Processamento Imagens (35.500 ha × R$ 0,54)      = R$    19.071
                                              Subtotal = R$   173.698

ITEM 4 - Cadastro Fundiário
  → Análises Matrículas (1.220 prop × R$ 74,05)      = R$    90.343
  → Coleta Assinaturas (1.220 un × R$ 557,99)        = R$   680.755
  → Retificação/Desmembramento (1.000 prop × R$ 376,04) = R$ 376.038
                                              Subtotal = R$ 1.147.136

ITEM 5 - Base Cartográfica
  → Download Base (7 un × R$ 316,68)                 = R$     2.217
  → Vetorização Uso Solo (35.500 ha × R$ 1,83)       = R$    64.823
                                              Subtotal = R$    67.040

ITEM 6 - Assistência Técnica em Perícias
  → Perícias (10 un × R$ 945,00)                     = R$     9.450
```

### Lógica de Vinculação e Ajuste

**Fórmula base (sem ajuste):**
```text
Preço Item = (Custo Composições do Grupo + Rateio ADM Local) × (1 + BDI%)
ADM rateado = 974.220 × (custo do grupo / custo total serviços)
```

**Problema**: Com rateio proporcional, o Planialtimétrico fica com preço/km ≈ R$ 920 — ainda abaixo de R$ 1.067,96.

**Solução**: Redistribuir o rateio de ADM Local com peso maior para o grupo de Topografia, até que o preço unitário do Planialtimétrico alcance ≥ R$ 1.070/km. A diferença é compensada reduzindo proporcionalmente o rateio dos demais grupos. O total global permanece R$ 8.775.000.

### Execução

1. **Script Python** — Consulta dados do banco e calcula:
   - Agrupamento das 14 composições nos 6 itens
   - Rateio de ADM Local ajustado (peso extra para Topografia)
   - Verificação: preço planialtimétrico/km > R$ 1.067,96
   - Total = preço alvo do orçamento

2. **DOCX (docx-js/Node.js)** — Relatório de Exequibilidade:
   - Composições na ordem do sistema (ordem_id)
   - Memória de cálculo com fórmulas e parâmetros
   - ADM Local detalhado com rateio explícito
   - BDI e DRE
   - Quadro demonstrando que planialtimétrico > Classe I N

3. **XLSX (openpyxl/Python)** — Planilha de Custos:
   - Aba 1: 6 itens + Reembolso R$ 120.000 = Total geral
   - Aba 2: Composições detalhadas (MO + Equipamentos + Materiais)
   - Cada valor da Aba 1 rastreável às composições do DOCX
   - Fórmulas Excel para verificação

4. **QA visual** — Converter DOCX para imagens e verificar layout


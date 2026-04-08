

## Geração Direta dos Relatórios de Exequibilidade — CEMIG 500-H21610

### Contexto

Gerar dois arquivos diretamente via script, sem alterar o código do sistema:
1. **Relatório de Exequibilidade (DOCX)** — memória de cálculo detalhada
2. **Planilha de Custos (XLSX)** — no formato do modelo do edital, preenchida

### Dados coletados do banco

- **Orçamento**: 04083d93 vinculado à oportunidade CEMIG-FUND-MG (Irapé/MG)
- **Custo Serviços**: R$ 5.352.439,87
- **Custo ADM Local**: R$ 974.220,00 (36 meses × R$ 27.061,67/mês)
- **Custo Total (CD)**: R$ 6.326.659,87
- **Preço alvo (sem reembolso)**: R$ 8.778.500,00
- **BDI efetivo a recalcular**: ~38,75%
- **14 composições** com insumos detalhados (mão de obra, equipamentos, materiais)
- **BDI componentes**: AC 14%, S+G 0,5%, ISS 5%, PIS 0,65%, COFINS 3%, CSLL 2,88%, IRPJ 8%, Lucro ~5%
- **Mobilização**: hospedagem R$ 6.000/mês, 3 veículos, pedágios R$ 1.500/mês, diversos R$ 3.500/mês

### Estrutura do DOCX

```text
CAPA
1. APRESENTAÇÃO
2. OBJETO DA CONTRATAÇÃO
3. COMPOSIÇÃO DE CUSTOS POR SERVIÇO
   - Para cada composição: tabela com insumos, parâmetros, fórmulas
4. CUSTOS INDIRETOS - ADM LOCAL
   - Hospedagem, Veículos/Combustível, Pedágios, Diversos
   - Total mensal × 36 meses
5. FORMAÇÃO DO BDI (MARKUP)
   - Componentes e fórmula
   - BDI ajustado para o preço de R$ 8.778.500,00
6. DRE - DEMONSTRATIVO DE RESULTADO
7. QUADRO COMPARATIVO COM REFERÊNCIAS DE MERCADO
8. CONCLUSÃO
```

### Estrutura do XLSX

- **Página 1**: 6 serviços do edital + Reembolso R$ 120.000 = Total R$ 8.898.500
- **Página 2**: Mão de Obra e Equipamentos detalhados (formato do modelo)
- Valores estratificados por faixa de hectares (item 13.1)

### Execução

1. Script Python usando `docx` (npm) para DOCX e `openpyxl` para XLSX
2. Dados hardcoded extraídos do banco (já coletados)
3. Arquivos gerados em `/mnt/documents/`
4. QA visual obrigatório


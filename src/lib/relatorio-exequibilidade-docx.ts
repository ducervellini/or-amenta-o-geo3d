/**
 * Gerador de Relatório de Exequibilidade em DOCX
 * Usa docx-js para layout profissional
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak,
} from "docx";

// ── Types ──
export interface ServicoRelatorio {
  codigo: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
  subtotal: number;
  produtividadePadrao: number | null;
  unidadeTempoProdutividade: string;
}

export interface DadosRelatorioDocx {
  oportunidade: {
    codigo: string;
    descricao: string;
    cliente: string;
    cidade: string;
    estado: string;
    grupoServicos: string;
  };
  servicos: ServicoRelatorio[];
  custoServicosPorTipo: Record<string, number>;
  custoServicos: number;
  custoAdmLocal: number;
  custoTotal: number;
  bdiPercentual: number;
  precoTotal: number;
  valorBdi: number;
  bdiComponentes: Array<{ nome: string; percentual: number; categoria?: string }>;
  bdiNome: string;
  mobilizacao: {
    nome: string;
    diasProdutivos: number;
    custoPorDia: number;
    distanciaBaseProjeto: number;
    diasChuva: number;
    fatorImprodutividade: number;
    duracaoMeses: number;
    jornadaDiaria: number;
    regimeTrabalho: string;
  } | null;
  deslocamentosPorCategoria: Record<string, number>;
  custoDeslocamentos: number;
  custoMobDesmob: number;
  composicaoItens: Array<{
    composicaoId: string;
    composicaoCodigo: string;
    tipoInsumo: string;
    descricao: string;
    custoUnitario: number;
    quantidade: number;
    coeficiente: number;
    custoTotal: number;
    unidade: string;
  }>;
  numEquipes: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const PRIMARY = "1E40AF";
const PRIMARY_LIGHT = "DBEAFE";
const DARK = "0F172A";
const GRAY = "64748B";
const LIGHT_GRAY = "F1F5F9";
const ACCENT = "4F46E5";
const SUCCESS_BG = "DCFCE7";
const DANGER_BG = "FEE2E2";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: PRIMARY, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })],
  });
}

function dataCell(text: string, width: number, opts?: { bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; fill?: string }): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts?.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      alignment: opts?.align || AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts?.bold, font: "Arial", size: 18 })],
    })],
  });
}

function sectionTitle(num: number, title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 360, after: 200 },
    shading: { fill: PRIMARY_LIGHT, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: PRIMARY, space: 4 } },
    children: [new TextRun({ text: `${num}. ${title}`, bold: true, font: "Arial", size: 24, color: PRIMARY })],
  });
}

function subTitle(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: title, bold: true, font: "Arial", size: 20, color: DARK })],
  });
}

function para(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 18, color: DARK })],
  });
}

function keyValuePara(key: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${key}: `, bold: true, font: "Arial", size: 18, color: GRAY }),
      new TextRun({ text: value, font: "Arial", size: 18, color: DARK }),
    ],
  });
}

export async function gerarRelatorioDocx(dados: DadosRelatorioDocx): Promise<Blob> {
  const numEquipes = dados.numEquipes || 4;
  const prazoEstimado = dados.mobilizacao?.duracaoMeses || 12;
  const diasProdutivosMes = dados.mobilizacao?.diasProdutivos || 22;

  // ── Compute productivity schedule per service ──
  interface CronogramaItem {
    s: ServicoRelatorio;
    prodDia: number;
    diasTotais: number;
    diasPorEquipe: number;
    meses: number;
    equipesNecessarias: number;
  }
  const cronograma: CronogramaItem[] = dados.servicos.map(s => {
    let prodDia = s.produtividadePadrao || 0;
    if (s.unidadeTempoProdutividade === "hora") {
      prodDia = prodDia * (dados.mobilizacao?.jornadaDiaria || 8);
    } else if (s.unidadeTempoProdutividade === "mes") {
      prodDia = prodDia / diasProdutivosMes;
    }
    if (prodDia <= 0) prodDia = 1;
    const diasTotais = Math.ceil(s.quantidade / prodDia);
    const diasPorEquipe = Math.ceil(diasTotais / numEquipes);
    const meses = Math.max(1, Math.ceil(diasPorEquipe / diasProdutivosMes));
    return { s, prodDia, diasTotais, diasPorEquipe, meses, equipesNecessarias: numEquipes };
  });

  // ── Financial calcs ──
  const tributosReceita = dados.bdiComponentes.filter(c => {
    const n = c.nome.toUpperCase();
    return c.categoria?.toLowerCase() === "tributo" || ["ISS", "PIS", "COFINS"].some(t => n.includes(t));
  });
  const totalTribPct = tributosReceita.reduce((s, c) => s + c.percentual, 0);
  const totalTributos = dados.precoTotal * (totalTribPct / 100);
  const despesasIndiretas = dados.bdiComponentes.filter(c => {
    const n = c.nome.toUpperCase();
    return !["ISS", "PIS", "COFINS", "IRPJ", "CSLL", "LUCRO"].some(t => n.includes(t))
      && c.categoria?.toLowerCase() !== "tributo" && c.categoria?.toLowerCase() !== "ir" && c.categoria?.toLowerCase() !== "lucro";
  });
  const totalDespPct = despesasIndiretas.reduce((s, c) => s + c.percentual, 0);
  const totalDesp = dados.custoTotal * (totalDespPct / 100);
  let irPct = 0;
  const irComponents = dados.bdiComponentes.filter(c => ["IRPJ", "CSLL"].some(t => c.nome.toUpperCase().includes(t)));
  irPct = irComponents.length > 0 ? irComponents.reduce((s, c) => s + c.percentual, 0) : 7.68;
  const totalIR = dados.precoTotal * (irPct / 100);
  const lucroLiquido = dados.precoTotal - totalTributos - dados.custoTotal - totalDesp - totalIR;
  const margemContrib = dados.precoTotal - totalTributos - dados.custoServicos;
  const ebitda = dados.precoTotal - totalTributos - dados.custoTotal;
  const margemLiqPct = dados.precoTotal > 0 ? (lucroLiquido / dados.precoTotal) * 100 : 0;

  const TIPO_LABELS: Record<string, string> = {
    mao_de_obra: "Mão de Obra", equipamento: "Equipamentos",
    veiculo: "Veículos", material: "Materiais", combustivel: "Combustível",
  };
  const CATEGORIAS: Record<string, string> = {
    hospedagem: "Hospedagem", combustivel: "Veículo + Combustível",
    pedagios: "Pedágios", passagens: "Passagens", diversos: "Diversos",
  };

  const children: (Paragraph | Table)[] = [];

  // ════════════════════════════════════════
  // CAPA
  // ════════════════════════════════════════
  children.push(new Paragraph({ spacing: { before: 2400 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 80 },
    children: [new TextRun({ text: "RELATÓRIO DE", bold: true, font: "Arial", size: 56, color: PRIMARY })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 200 },
    children: [new TextRun({ text: "EXEQUIBILIDADE", bold: true, font: "Arial", size: 56, color: PRIMARY })],
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY, space: 8 } },
    children: [new TextRun({ text: "Demonstração de Viabilidade Técnica e Financeira", font: "Arial", size: 24, color: GRAY, italics: true })],
  }));
  children.push(new Paragraph({ spacing: { after: 600 }, children: [] }));

  const infoLines = [
    `Processo: ${dados.oportunidade.codigo}`,
    `Cliente: ${dados.oportunidade.cliente}`,
    `Local: ${dados.oportunidade.cidade}/${dados.oportunidade.estado}`,
    `Grupo de Serviços: ${dados.oportunidade.grupoServicos}`,
    `Data: ${new Date().toLocaleDateString("pt-BR")}`,
  ];
  for (const line of infoLines) {
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: line, font: "Arial", size: 20, color: GRAY })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: 600, after: 100 }, children: [] }));
  children.push(new Paragraph({
    shading: { fill: PRIMARY, type: ShadingType.CLEAR },
    spacing: { after: 0 },
    children: [new TextRun({ text: `  VALOR DA PROPOSTA: ${fmt(dados.precoTotal)}`, bold: true, font: "Arial", size: 28, color: "FFFFFF" })],
  }));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ════════════════════════════════════════
  // 1. RESUMO EXECUTIVO
  // ════════════════════════════════════════
  children.push(sectionTitle(1, "RESUMO EXECUTIVO"));
  children.push(para(
    `O presente relatório demonstra a exequibilidade técnica e financeira da proposta apresentada para o processo ` +
    `${dados.oportunidade.codigo}, referente a "${dados.oportunidade.descricao}", para o cliente ${dados.oportunidade.cliente}, ` +
    `a ser executado em ${dados.oportunidade.cidade}/${dados.oportunidade.estado}.`
  ));

  // Summary table
  const summaryData = [
    ["Valor Total da Proposta", fmt(dados.precoTotal)],
    ["Custo Direto Total", fmt(dados.custoTotal)],
    ["BDI Aplicado", fmtPct(dados.bdiPercentual)],
    ["Prazo Estimado", `${prazoEstimado} meses`],
    ["Número de Equipes", `${numEquipes} equipes`],
    ["Composições de Custo", `${dados.servicos.length} serviços`],
  ];
  const COL_LABEL = 5400;
  const COL_VALUE = 3960;
  const TABLE_W = COL_LABEL + COL_VALUE;
  children.push(new Paragraph({ spacing: { before: 100 }, children: [] }));

  children.push(new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: [COL_LABEL, COL_VALUE],
    rows: [
      new TableRow({ children: [headerCell("Indicador", COL_LABEL), headerCell("Valor", COL_VALUE)] }),
      ...summaryData.map((row, i) => new TableRow({
        children: [
          dataCell(row[0], COL_LABEL, { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(row[1], COL_VALUE, { bold: true, align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
        ],
      })),
    ],
  }));

  children.push(subTitle("Principais Serviços"));
  for (const s of dados.servicos.slice(0, 10)) {
    children.push(new Paragraph({
      spacing: { after: 40 },
      numbering: { reference: "bullets", level: 0 },
      children: [new TextRun({ text: `${s.codigo} — ${s.nome}: ${fmtNum(s.quantidade)} ${s.unidade} (${fmt(s.subtotal)})`, font: "Arial", size: 16 })],
    }));
  }

  children.push(para(
    `Com base nas composições de custos unitários, nos parâmetros de BDI adotados e no dimensionamento operacional ` +
    `detalhado nas seções seguintes, declara-se que os preços propostos são EXEQUÍVEIS, ` +
    `sustentados por metodologia técnica comprovada, produtividades reais e estrutura financeira adequada.`
  ));

  // ════════════════════════════════════════
  // 2. ÍNDICES DE PRODUTIVIDADE (substitui metodologia)
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(2, "ÍNDICES DE PRODUTIVIDADE"));

  children.push(para(
    `As produtividades adotadas foram definidas com base no histórico de projetos executados pela empresa, ` +
    `considerando o regime de trabalho de ${dados.mobilizacao?.jornadaDiaria || 8}h diárias, ` +
    `${diasProdutivosMes} dias produtivos/mês e condições regionais de acesso e clima. ` +
    `O fator de improdutividade aplicado é de ${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)}, ` +
    `que contempla dias de chuva (${dados.mobilizacao?.diasChuva || 5} dias/mês) e paradas operacionais.`
  ));

  children.push(subTitle("Detalhamento por Serviço"));

  // Productivity table
  const prodCols = [1800, 2400, 1200, 1600, 1200, 1160];
  const prodTableW = prodCols.reduce((a, b) => a + b, 0);

  children.push(new Table({
    width: { size: prodTableW, type: WidthType.DXA },
    columnWidths: prodCols,
    rows: [
      new TableRow({
        children: [
          headerCell("Código", prodCols[0]),
          headerCell("Serviço", prodCols[1]),
          headerCell("Unidade", prodCols[2]),
          headerCell("Produtividade", prodCols[3]),
          headerCell("Und. Tempo", prodCols[4]),
          headerCell("Prod./Dia", prodCols[5]),
        ],
      }),
      ...cronograma.map((c, i) => {
        const fill = i % 2 === 1 ? LIGHT_GRAY : undefined;
        const unTempo = c.s.unidadeTempoProdutividade === "hora" ? "por hora" :
          c.s.unidadeTempoProdutividade === "mes" ? "por mês" : "por dia";
        return new TableRow({
          children: [
            dataCell(c.s.codigo, prodCols[0], { fill }),
            dataCell(c.s.nome.substring(0, 30), prodCols[1], { fill }),
            dataCell(c.s.unidade, prodCols[2], { fill }),
            dataCell(c.s.produtividadePadrao ? fmtNum(c.s.produtividadePadrao) : "—", prodCols[3], { align: AlignmentType.RIGHT, fill }),
            dataCell(unTempo, prodCols[4], { fill }),
            dataCell(fmtNum(c.prodDia), prodCols[5], { bold: true, align: AlignmentType.RIGHT, fill }),
          ],
        });
      }),
    ],
  }));

  children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
  children.push(subTitle("Justificativa Técnica"));
  children.push(para(
    `Os índices de produtividade adotados são conservadores em relação ao histórico real de execução, ` +
    `o que proporciona margem de segurança ao cronograma. As produtividades por dia consideram ` +
    `a jornada de ${dados.mobilizacao?.jornadaDiaria || 8}h diárias e foram validadas em projetos anteriores de escopo similar.`
  ));

  // ════════════════════════════════════════
  // 3. DIMENSIONAMENTO OPERACIONAL E CRONOGRAMA DE RECURSOS
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(3, "DIMENSIONAMENTO OPERACIONAL E CRONOGRAMA DE RECURSOS"));

  children.push(keyValuePara("Quantidade de Equipes", `${numEquipes} equipes simultâneas`));
  children.push(keyValuePara("Regime de Trabalho", dados.mobilizacao?.regimeTrabalho || "Jornada regular 8h/dia, 5x2"));
  children.push(keyValuePara("Jornada Diária", `${dados.mobilizacao?.jornadaDiaria || 8} horas`));
  children.push(keyValuePara("Duração Estimada", `${prazoEstimado} meses`));
  children.push(keyValuePara("Dias Produtivos/Mês", `${diasProdutivosMes} dias`));

  children.push(subTitle("Cronograma de Recursos por Serviço"));

  const cronCols = [1400, 2000, 1100, 1000, 1000, 1000, 860];
  const cronTableW = cronCols.reduce((a, b) => a + b, 0);

  children.push(new Table({
    width: { size: cronTableW, type: WidthType.DXA },
    columnWidths: cronCols,
    rows: [
      new TableRow({
        children: [
          headerCell("Código", cronCols[0]),
          headerCell("Serviço", cronCols[1]),
          headerCell("Quantidade", cronCols[2]),
          headerCell("Prod./Dia", cronCols[3]),
          headerCell("Dias Total", cronCols[4]),
          headerCell("Dias/Equipe", cronCols[5]),
          headerCell("Meses", cronCols[6]),
        ],
      }),
      ...cronograma.map((c, i) => {
        const fill = i % 2 === 1 ? LIGHT_GRAY : undefined;
        return new TableRow({
          children: [
            dataCell(c.s.codigo, cronCols[0], { fill }),
            dataCell(c.s.nome.substring(0, 25), cronCols[1], { fill }),
            dataCell(`${fmtNum(c.s.quantidade)} ${c.s.unidade}`, cronCols[2], { align: AlignmentType.RIGHT, fill }),
            dataCell(fmtNum(c.prodDia), cronCols[3], { align: AlignmentType.RIGHT, fill }),
            dataCell(`${c.diasTotais}`, cronCols[4], { align: AlignmentType.RIGHT, fill }),
            dataCell(`${c.diasPorEquipe}`, cronCols[5], { align: AlignmentType.RIGHT, bold: true, fill }),
            dataCell(`${c.meses}`, cronCols[6], { align: AlignmentType.RIGHT, bold: true, fill }),
          ],
        });
      }),
    ],
  }));

  // Cronograma visual (Gantt simplificado)
  const maxMeses = Math.max(...cronograma.map(c => c.meses), 1);
  children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
  children.push(subTitle("Cronograma Físico Estimado (Linha do Tempo)"));

  for (const c of cronograma) {
    const bar = "█".repeat(Math.max(1, Math.round((c.meses / maxMeses) * 20)));
    const spaces = " ".repeat(Math.max(0, 20 - bar.length));
    children.push(new Paragraph({
      spacing: { after: 30 },
      children: [
        new TextRun({ text: `${c.s.codigo.padEnd(12)} `, font: "Courier New", size: 16, bold: true }),
        new TextRun({ text: bar, font: "Courier New", size: 16, color: PRIMARY }),
        new TextRun({ text: `${spaces} ${c.meses}m`, font: "Courier New", size: 16, color: GRAY }),
      ],
    }));
  }

  // ════════════════════════════════════════
  // 4. LOGÍSTICA E MOBILIZAÇÃO
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(4, "LOGÍSTICA E MOBILIZAÇÃO"));

  if (dados.mobilizacao) {
    children.push(keyValuePara("Base Operacional", dados.mobilizacao.nome));
    children.push(keyValuePara("Distância Base-Projeto", `${fmtNum(dados.mobilizacao.distanciaBaseProjeto)} km`));
    children.push(keyValuePara("Dias de Chuva/Mês", `${dados.mobilizacao.diasChuva} dias`));
    children.push(keyValuePara("Fator Improdutividade", fmtPct(dados.mobilizacao.fatorImprodutividade * 100)));
  }

  children.push(subTitle("Custos Logísticos"));
  const logRows: string[][] = [];
  for (const [cat, valor] of Object.entries(dados.deslocamentosPorCategoria)) {
    if (valor > 0) logRows.push([CATEGORIAS[cat] || cat, fmt(valor)]);
  }
  if (dados.custoMobDesmob > 0) logRows.push(["Mobilização / Desmobilização", fmt(dados.custoMobDesmob)]);
  logRows.push(["TOTAL ADM LOCAL", fmt(dados.custoAdmLocal)]);

  if (logRows.length > 0) {
    children.push(new Table({
      width: { size: TABLE_W, type: WidthType.DXA },
      columnWidths: [COL_LABEL, COL_VALUE],
      rows: [
        new TableRow({ children: [headerCell("Categoria", COL_LABEL), headerCell("Valor", COL_VALUE)] }),
        ...logRows.map((row, i) => {
          const isTotal = i === logRows.length - 1;
          return new TableRow({
            children: [
              dataCell(row[0], COL_LABEL, { bold: isTotal, fill: isTotal ? PRIMARY_LIGHT : (i % 2 === 1 ? LIGHT_GRAY : undefined) }),
              dataCell(row[1], COL_VALUE, { bold: true, align: AlignmentType.RIGHT, fill: isTotal ? PRIMARY_LIGHT : (i % 2 === 1 ? LIGHT_GRAY : undefined) }),
            ],
          });
        }),
      ],
    }));
  }

  children.push(para(
    `O impacto pluviométrico foi considerado através do fator de improdutividade de ` +
    `${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)}, reduzindo os dias úteis de trabalho. ` +
    `O critério de mudança de base ocorre quando a distância ao local de trabalho excede 100 km.`
  ));

  // ════════════════════════════════════════
  // 5. COMPOSIÇÃO DE CUSTOS (CCU)
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(5, "COMPOSIÇÃO DE CUSTOS (CCU)"));

  children.push(subTitle("Resumo por Tipo de Insumo"));
  const tipoCols = [4000, 3000, 2360];
  const tipoTableW = tipoCols.reduce((a, b) => a + b, 0);
  const tipoRows: Array<{ label: string; valor: number; pct: number }> = [];
  for (const [tipo, valor] of Object.entries(dados.custoServicosPorTipo)) {
    if (valor > 0) tipoRows.push({ label: TIPO_LABELS[tipo] || tipo, valor, pct: dados.custoServicos > 0 ? (valor / dados.custoServicos) * 100 : 0 });
  }

  children.push(new Table({
    width: { size: tipoTableW, type: WidthType.DXA },
    columnWidths: tipoCols,
    rows: [
      new TableRow({ children: [headerCell("Tipo de Insumo", tipoCols[0]), headerCell("Valor", tipoCols[1]), headerCell("% do CD", tipoCols[2])] }),
      ...tipoRows.map((row, i) => new TableRow({
        children: [
          dataCell(row.label, tipoCols[0], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(fmt(row.valor), tipoCols[1], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(fmtPct(row.pct), tipoCols[2], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
        ],
      })),
      new TableRow({
        children: [
          dataCell("TOTAL SERVIÇOS", tipoCols[0], { bold: true, fill: PRIMARY_LIGHT }),
          dataCell(fmt(dados.custoServicos), tipoCols[1], { bold: true, align: AlignmentType.RIGHT, fill: PRIMARY_LIGHT }),
          dataCell("100,00%", tipoCols[2], { bold: true, align: AlignmentType.RIGHT, fill: PRIMARY_LIGHT }),
        ],
      }),
    ],
  }));

  children.push(subTitle("Detalhamento por Composição"));
  const ccuCols = [1400, 2300, 1500, 1800, 2360];
  const ccuTableW = ccuCols.reduce((a, b) => a + b, 0);

  children.push(new Table({
    width: { size: ccuTableW, type: WidthType.DXA },
    columnWidths: ccuCols,
    rows: [
      new TableRow({
        children: [
          headerCell("Código", ccuCols[0]), headerCell("Composição", ccuCols[1]),
          headerCell("Quantidade", ccuCols[2]), headerCell("Custo Unit.", ccuCols[3]),
          headerCell("Subtotal", ccuCols[4]),
        ],
      }),
      ...dados.servicos.map((s, i) => new TableRow({
        children: [
          dataCell(s.codigo, ccuCols[0], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(s.nome.substring(0, 30), ccuCols[1], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(`${fmtNum(s.quantidade)} ${s.unidade}`, ccuCols[2], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(fmt(s.custoUnitario), ccuCols[3], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(fmt(s.subtotal), ccuCols[4], { bold: true, align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
        ],
      })),
      new TableRow({
        children: [
          dataCell("", ccuCols[0], { fill: PRIMARY_LIGHT }),
          dataCell("TOTAL", ccuCols[1], { bold: true, fill: PRIMARY_LIGHT }),
          dataCell("", ccuCols[2], { fill: PRIMARY_LIGHT }),
          dataCell("", ccuCols[3], { fill: PRIMARY_LIGHT }),
          dataCell(fmt(dados.custoServicos), ccuCols[4], { bold: true, align: AlignmentType.RIGHT, fill: PRIMARY_LIGHT }),
        ],
      }),
    ],
  }));

  // BDI
  children.push(subTitle("Administração Central (BDI)"));
  children.push(keyValuePara("Perfil BDI", `${dados.bdiNome} — ${fmtPct(dados.bdiPercentual)}`));

  children.push(new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: [COL_LABEL, COL_VALUE],
    rows: [
      new TableRow({ children: [
        headerCell("Componente BDI", COL_LABEL),
        headerCell("%", COL_VALUE),
      ].map((c, ci) => {
        if (ci === 0) return c;
        return new TableCell({
          borders, width: { size: COL_VALUE, type: WidthType.DXA },
          shading: { fill: ACCENT, type: ShadingType.CLEAR }, margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "%", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })],
        });
      }) }),
      ...dados.bdiComponentes.map((c, i) => new TableRow({
        children: [
          dataCell(c.nome, COL_LABEL, { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(fmtPct(c.percentual), COL_VALUE, { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
        ],
      })),
      new TableRow({
        children: [
          dataCell("BDI EFETIVO", COL_LABEL, { bold: true, fill: PRIMARY_LIGHT }),
          dataCell(fmtPct(dados.bdiPercentual), COL_VALUE, { bold: true, align: AlignmentType.RIGHT, fill: PRIMARY_LIGHT }),
        ],
      }),
    ],
  }));

  // ════════════════════════════════════════
  // 6. ANÁLISE FINANCEIRA
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(6, "ANÁLISE FINANCEIRA"));

  children.push(subTitle("Demonstrativo de Resultado (DRE)"));
  const dreData: Array<[string, string, string?]> = [
    ["Receita Bruta (Preço de Venda)", fmt(dados.precoTotal)],
    ["(-) Tributos sobre Receita", `-${fmt(totalTributos)}`],
    ["= Receita Líquida", fmt(dados.precoTotal - totalTributos), SUCCESS_BG],
    ["(-) Custo Direto Total", `-${fmt(dados.custoTotal)}`],
    ["   • Serviços", `-${fmt(dados.custoServicos)}`],
    ["   • ADM Local", `-${fmt(dados.custoAdmLocal)}`],
    ["= Margem de Contribuição", fmt(margemContrib), SUCCESS_BG],
    ["(-) Despesas Indiretas (BDI)", `-${fmt(totalDesp)}`],
    ["= EBITDA Estimado", fmt(ebitda), SUCCESS_BG],
    ["(-) IRPJ + CSLL", `-${fmt(totalIR)}`],
    ["= LUCRO LÍQUIDO", fmt(lucroLiquido), lucroLiquido >= 0 ? SUCCESS_BG : DANGER_BG],
  ];

  children.push(new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: [COL_LABEL, COL_VALUE],
    rows: dreData.map((row, i) => new TableRow({
      children: [
        dataCell(row[0], COL_LABEL, { bold: row[2] !== undefined, fill: row[2] || (i % 2 === 1 ? LIGHT_GRAY : undefined) }),
        dataCell(row[1], COL_VALUE, { bold: true, align: AlignmentType.RIGHT, fill: row[2] || (i % 2 === 1 ? LIGHT_GRAY : undefined) }),
      ],
    })),
  }));

  children.push(subTitle("Indicadores Financeiros"));
  const margemContribPct = dados.precoTotal > 0 ? (margemContrib / dados.precoTotal) * 100 : 0;
  const ebitdaPct = dados.precoTotal > 0 ? (ebitda / dados.precoTotal) * 100 : 0;

  const indCols = [3500, 3000, 2860];
  const indTableW = indCols.reduce((a, b) => a + b, 0);
  const indicadores = [
    ["Margem de Contribuição", fmt(margemContrib), fmtPct(margemContribPct)],
    ["EBITDA Estimado", fmt(ebitda), fmtPct(ebitdaPct)],
    ["Lucro Líquido", fmt(lucroLiquido), fmtPct(margemLiqPct)],
    ["Impostos Totais", fmt(totalTributos + totalIR), fmtPct(totalTribPct + irPct)],
  ];

  children.push(new Table({
    width: { size: indTableW, type: WidthType.DXA },
    columnWidths: indCols,
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, width: { size: indCols[0], type: WidthType.DXA }, shading: { fill: "16A34A", type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: "Indicador", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
          new TableCell({ borders, width: { size: indCols[1], type: WidthType.DXA }, shading: { fill: "16A34A", type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
          new TableCell({ borders, width: { size: indCols[2], type: WidthType.DXA }, shading: { fill: "16A34A", type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: "% da Receita", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
        ],
      }),
      ...indicadores.map((row, i) => new TableRow({
        children: [
          dataCell(row[0], indCols[0], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(row[1], indCols[1], { bold: true, align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(row[2], indCols[2], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
        ],
      })),
    ],
  }));

  // ════════════════════════════════════════
  // 7. CURVA DE EXECUÇÃO
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(7, "CURVA DE EXECUÇÃO"));

  children.push(subTitle("Evolução Física Estimada (Curva S)"));
  const totalMeses = prazoEstimado;
  const curvaCols = [1400, 1800, 2200, 3960];
  const curvaTableW = curvaCols.reduce((a, b) => a + b, 0);

  const curvaRows: Array<[string, string, string, string]> = [];
  for (let m = 1; m <= Math.min(totalMeses, 18); m++) {
    const t = m / totalMeses;
    const pctAcum = Math.round((3 * t * t - 2 * t * t * t) * 100);
    const pctMes = m === 1 ? pctAcum : pctAcum - Math.round((3 * ((m - 1) / totalMeses) ** 2 - 2 * ((m - 1) / totalMeses) ** 3) * 100);
    const bar = "█".repeat(Math.max(1, Math.round(pctMes / 3)));
    curvaRows.push([`Mês ${m}`, `${pctMes}%`, `${pctAcum}%`, bar]);
  }

  children.push(new Table({
    width: { size: curvaTableW, type: WidthType.DXA },
    columnWidths: curvaCols,
    rows: [
      new TableRow({
        children: [
          headerCell("Período", curvaCols[0]), headerCell("% Mês", curvaCols[1]),
          headerCell("% Acumulado", curvaCols[2]), headerCell("Evolução", curvaCols[3]),
        ],
      }),
      ...curvaRows.map((row, i) => new TableRow({
        children: [
          dataCell(row[0], curvaCols[0], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(row[1], curvaCols[1], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(row[2], curvaCols[2], { bold: true, align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          new TableCell({
            borders, width: { size: curvaCols[3], type: WidthType.DXA },
            shading: i % 2 === 1 ? { fill: LIGHT_GRAY, type: ShadingType.CLEAR } : undefined,
            margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: row[3], font: "Courier New", size: 16, color: PRIMARY })] })],
          }),
        ],
      })),
    ],
  }));

  // ════════════════════════════════════════
  // 8. ANÁLISE DE RISCOS
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(8, "ANÁLISE DE RISCOS"));

  const riscos = [
    { risco: "Clima (Precipitação)", impacto: "Alto", prob: "Média",
      mitigacao: `Fator de improdutividade de ${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)} já aplicado. Monitoramento pluviométrico contínuo.` },
    { risco: "Logística e Acesso", impacto: "Médio", prob: "Baixa",
      mitigacao: "Reconhecimento prévio das áreas. Veículos 4x4. Bases estrategicamente posicionadas." },
    { risco: "Produtividade Abaixo do Esperado", impacto: "Alto", prob: "Baixa",
      mitigacao: "Produtividades baseadas em histórico real. Margem de segurança no cronograma." },
    { risco: "Variação Cambial/Inflação", impacto: "Baixo", prob: "Média",
      mitigacao: "Contratos com valores fixos. Cláusula de reequilíbrio prevista." },
  ];

  const riskCols = [2000, 1200, 1000, 5160];
  const riskTableW = riskCols.reduce((a, b) => a + b, 0);

  children.push(new Table({
    width: { size: riskTableW, type: WidthType.DXA },
    columnWidths: riskCols,
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, width: { size: riskCols[0], type: WidthType.DXA }, shading: { fill: "DC2626", type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: "Risco", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
          new TableCell({ borders, width: { size: riskCols[1], type: WidthType.DXA }, shading: { fill: "DC2626", type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: "Impacto", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
          new TableCell({ borders, width: { size: riskCols[2], type: WidthType.DXA }, shading: { fill: "DC2626", type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: "Prob.", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
          new TableCell({ borders, width: { size: riskCols[3], type: WidthType.DXA }, shading: { fill: "DC2626", type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: "Mitigação", bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
        ],
      }),
      ...riscos.map((r, i) => new TableRow({
        children: [
          dataCell(r.risco, riskCols[0], { bold: true, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(r.impacto, riskCols[1], { align: AlignmentType.CENTER, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(r.prob, riskCols[2], { align: AlignmentType.CENTER, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(r.mitigacao, riskCols[3], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
        ],
      })),
    ],
  }));

  // ════════════════════════════════════════
  // 9. CONCLUSÃO
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(9, "CONCLUSÃO"));

  children.push(para(
    `Diante do exposto ao longo deste relatório, conclui-se que a proposta no valor de ${fmt(dados.precoTotal)} ` +
    `é TÉCNICA E FINANCEIRAMENTE EXEQUÍVEL, conforme demonstrado a seguir:`
  ));

  const conclusoes = [
    `Os custos diretos foram compostos insumo a insumo, utilizando salários de mercado, custos de equipamentos reais e materiais com preços atualizados.`,
    `O BDI de ${fmtPct(dados.bdiPercentual)} (${dados.bdiNome}) contempla administração central, tributos, seguros e margem de lucro compatíveis com o porte do projeto.`,
    `A margem líquida projetada de ${fmtPct(margemLiqPct)} demonstra sustentabilidade financeira sem comprometer a qualidade dos serviços.`,
    `O dimensionamento de ${numEquipes} equipes simultâneas, no regime operacional adotado, permite a execução dentro do prazo contratual de ${prazoEstimado} meses.`,
    `Os riscos foram identificados e mitigados através de fatores de improdutividade, reservas de contingência e planejamento logístico adequado.`,
  ];

  for (const conc of conclusoes) {
    children.push(new Paragraph({
      spacing: { after: 80 },
      numbering: { reference: "checks", level: 0 },
      children: [new TextRun({ text: conc, font: "Arial", size: 18, color: DARK })],
    }));
  }

  // Signature
  children.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
  children.push(new Paragraph({
    spacing: { after: 40 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: GRAY, space: 4 } },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Responsável Técnico", bold: true, font: "Arial", size: 18 })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "CREA/CAU: ___________", font: "Arial", size: 16, color: GRAY })],
  }));

  children.push(new Paragraph({
    spacing: { before: 400, after: 40 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: GRAY, space: 4 } },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Diretor Técnico", bold: true, font: "Arial", size: 18 })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "CREA/CAU: ___________", font: "Arial", size: 16, color: GRAY })],
  }));

  // ── Build Document ──
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
        },
        {
          reference: "checks",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2713", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial", color: PRIMARY },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: DARK },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1134, bottom: 1440, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: PRIMARY, space: 4 } },
              children: [
                new TextRun({ text: `Relatório de Exequibilidade — ${dados.oportunidade.codigo}`, font: "Arial", size: 14, color: GRAY }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
              children: [
                new TextRun({ text: "Documento confidencial — Gerado automaticamente | Página ", font: "Arial", size: 14, color: GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: GRAY }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}

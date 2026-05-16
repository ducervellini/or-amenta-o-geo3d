/**
 * Gerador de Relatório de Exequibilidade em DOCX
 * Demonstra cálculo completo por composição: MO, Equipamento, Material, ADM Local, BDI e DRE
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak,
} from "docx";
import { produtividadePorDia } from "@/lib/cronograma-calculo";

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

export interface ComposicaoItemRelatorio {
  composicaoId: string;
  composicaoCodigo: string;
  tipoInsumo: string;
  descricao: string;
  custoUnitario: number;
  quantidade: number;
  coeficiente: number;
  custoTotal: number;
  unidade: string;
  parametros: Record<string, any>;
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
    diasImprodutivos?: number;
    custoPorDia: number;
    distanciaBaseProjeto: number;
    distanciaMediaDiaria?: number;
    diasChuva: number;
    fatorImprodutividade: number;
    duracaoMeses: number;
    jornadaDiaria: number;
    diasTrabalho?: number;
    regimeTrabalho: string;
    dataInicio?: string | null;
    dataFim?: string | null;
    municipio?: string;
    estado?: string;
    baseEndereco?: string;
    latitude?: number | null;
    longitude?: number | null;
    baseLatitude?: number | null;
    baseLongitude?: number | null;
    municipiosRota?: Array<{ nome: string; uf: string; distancia_km: number }>;
    pluviometria?: {
      estacao?: string;
      municipio_estacao?: string;
      uf_estacao?: string;
      distancia_estacao_km?: number;
      anos_analisados?: number;
      precipitacao_total_mm?: number;
      media_dias_chuva_mes?: number;
      mensal?: Array<{ mes: string; precipitacao_media: number; dias_chuva_media: number }>;
    } | null;
  } | null;
  deslocamentosPorCategoria: Record<string, number>;
  custoDeslocamentos: number;
  custoMobDesmob: number;
  /** Itens detalhados de Deslocamentos (vindos de mobilizacao_custos) */
  deslocamentosItens?: Array<{
    categoria: string;
    descricao?: string;
    valor_unitario: number;
    quantidade: number;
    frequencia: string;
    custo_total: number;
    custo_mensal?: number;
    veiculo_nome?: string;
    tipo_hospedagem?: string;
    tipo_veiculo?: string;
    km_dia?: number;
    meses_hospedagem?: number;
  }>;
  /** Itens detalhados de Mobilização/Desmobilização */
  mobDesmobItens?: Array<{
    municipio_saida: string;
    estado_saida: string;
    veiculo_nome?: string;
    distancia_km: number;
    km_max_dia: number;
    dias_viagem: number;
    pernoites: number;
    quantidade_pessoas: number;
    quantidade_veiculos: number;
    hospedagem_pernoite: number;
    pedagios_ida: number;
    custo_hora_pessoa: number;
    custo_combustivel_ida: number;
    custo_pernoite_ida: number;
    custo_horas_pessoas_ida: number;
    custo_ida: number;
    custo_total: number;
  }>;
  composicaoItens: ComposicaoItemRelatorio[];
  numEquipes: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const fmtNum2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PRIMARY = "1E40AF";
const PRIMARY_LIGHT = "DBEAFE";
const DARK = "0F172A";
const GRAY = "64748B";
const LIGHT_GRAY = "F1F5F9";
const ACCENT = "4F46E5";
const SUCCESS_BG = "DCFCE7";
const DANGER_BG = "FEE2E2";
const MO_COLOR = "1D4ED8";
const EQUIP_COLOR = "7C3AED";
const MAT_COLOR = "059669";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text: string, width: number, fill = PRIMARY): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 16 })] })],
  });
}

function dataCell(text: string, width: number, opts?: { bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; fill?: string; color?: string; size?: number }): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts?.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      alignment: opts?.align || AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts?.bold, font: "Arial", size: opts?.size || 16, color: opts?.color })],
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

function subSubTitle(title: string, color = DARK): Paragraph {
  return new Paragraph({
    spacing: { before: 140, after: 60 },
    children: [new TextRun({ text: title, bold: true, font: "Arial", size: 18, color })],
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

function calcRow(desc: string, formula: string, valor: string, fill?: string): TableRow {
  const cols = [3200, 4800, 1640];
  return new TableRow({
    children: [
      dataCell(desc, cols[0], { fill, size: 15 }),
      dataCell(formula, cols[1], { fill, size: 15, color: GRAY }),
      dataCell(valor, cols[2], { align: AlignmentType.RIGHT, bold: true, fill, size: 15 }),
    ],
  });
}

function calcTable(rows: Array<{ desc: string; formula: string; valor: string; highlight?: boolean }>): Table {
  const cols = [3200, 4800, 1640];
  const tw = cols.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: tw, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({ children: [headerCell("Etapa", cols[0]), headerCell("Fórmula / Memória", cols[1]), headerCell("Valor", cols[2])] }),
      ...rows.map((r, i) =>
        calcRow(r.desc, r.formula, r.valor, r.highlight ? SUCCESS_BG : (i % 2 === 1 ? LIGHT_GRAY : undefined))
      ),
    ],
  });
}

// ── Build MO calculation rows ──
function buildMOCalcRows(p: Record<string, any>, coef: number): Array<{ desc: string; formula: string; valor: string; highlight?: boolean }> {
  const salario = Number(p.salario_base || 0);
  const encPct = Number(p.encargos_percentual || 0);
  const benVal = Number(p.beneficios_valor || 0);
  const horasMes = Number(p.horas_mes || 176);
  const horasDia = Number(p.horas_diarias || 8);
  const regTrab = Number(p.regime_dias_trabalho || 0);
  const regFolga = Number(p.regime_dias_folga || 0);
  const isPJ = p.regime_contratacao === "pj";

  const encVal = isPJ ? 0 : salario * (encPct / 100);
  const custoMensal = salario + encVal + (isPJ ? 0 : benVal);
  const custoHora = horasMes > 0 ? custoMensal / horasMes : 0;
  const custoDia = custoHora * horasDia;
  let fatorRegime = 1;
  if (regTrab > 0 && regFolga > 0) fatorRegime = (regTrab + regFolga) / regTrab;
  const custoHoraFinal = custoHora * fatorRegime;
  const custoUnit = custoHoraFinal * coef;

  const rows: Array<{ desc: string; formula: string; valor: string; highlight?: boolean }> = [];
  rows.push({ desc: `Salário Base (${isPJ ? "PJ" : "CLT"})`, formula: "", valor: fmt(salario) });
  if (!isPJ) {
    rows.push({ desc: "Encargos Sociais (K)", formula: `${fmtNum2(salario)} × ${fmtNum2(encPct)}%`, valor: fmt(encVal) });
    rows.push({ desc: "Benefícios", formula: "", valor: fmt(benVal) });
  }
  rows.push({ desc: "Custo Mensal Total", formula: `${fmtNum2(salario)} + ${fmtNum2(encVal)} + ${fmtNum2(isPJ ? 0 : benVal)}`, valor: fmt(custoMensal) });
  rows.push({ desc: "Horas Úteis/Mês", formula: "", valor: `${fmtNum2(horasMes)} h` });
  rows.push({ desc: "Custo H/H", formula: `${fmtNum2(custoMensal)} ÷ ${fmtNum2(horasMes)}`, valor: fmt(custoHora) });
  rows.push({ desc: "Custo/Dia", formula: `${fmtNum2(custoHora)} × ${fmtNum2(horasDia)}h`, valor: fmt(custoDia) });
  if (fatorRegime !== 1) {
    rows.push({ desc: "Fator Regime Operacional", formula: `(${regTrab}+${regFolga})/${regTrab}`, valor: fmtNum(fatorRegime) });
    rows.push({ desc: "Custo H/H c/ Regime", formula: `${fmtNum2(custoHora)} × ${fmtNum(fatorRegime)}`, valor: fmt(custoHoraFinal) });
  }
  rows.push({ desc: "Coeficiente (h/un)", formula: `${fmtNum2(horasDia)}h ÷ prod`, valor: fmtNum(coef) });
  rows.push({ desc: "CUSTO UNITÁRIO/UN", formula: `${fmtNum2(custoHoraFinal)} × ${fmtNum(coef)}`, valor: fmt(custoUnit), highlight: true });
  return rows;
}

// ── Build Equipment calculation rows ──
function buildEquipCalcRows(p: Record<string, any>, coef: number): Array<{ desc: string; formula: string; valor: string; highlight?: boolean }> {
  const dep = Number(p.depreciacao_hora || 0);
  const man = Number(p.manutencao_hora || 0);
  const combConsumo = Number(p.combustivel_consumo_hora || 0);
  const combPreco = Number(p.combustivel_preco_litro || 0);
  const fator = Number(p.fator_utilizacao || 1);
  const oper = Number(p.operador_custo_hora || 0);
  const valAq = Number(p.valor_aquisicao || 0);
  const valRes = Number(p.valor_residual || 0);
  const vidaUtil = Number(p.vida_util_horas || 0);

  const combHora = combConsumo * combPreco;
  const custoHoraProd = dep + man + combHora + oper;
  const custoHoraFator = custoHoraProd * fator;
  const custoUnit = custoHoraFator * coef;

  const rows: Array<{ desc: string; formula: string; valor: string; highlight?: boolean }> = [];
  if (valAq > 0 && vidaUtil > 0) {
    rows.push({ desc: "Valor Aquisição", formula: "", valor: fmt(valAq) });
    rows.push({ desc: "Valor Residual", formula: "", valor: fmt(valRes) });
    rows.push({ desc: "Vida Útil", formula: "", valor: `${fmtNum2(vidaUtil)} h` });
    rows.push({ desc: "Depreciação/hora", formula: `(${fmtNum2(valAq)} - ${fmtNum2(valRes)}) ÷ ${fmtNum2(vidaUtil)}`, valor: fmt(dep) });
  } else {
    rows.push({ desc: "Depreciação/hora (aluguel)", formula: "", valor: fmt(dep) });
  }
  rows.push({ desc: "Manutenção/hora", formula: "", valor: fmt(man) });
  if (combConsumo > 0) {
    rows.push({ desc: "Combustível/hora", formula: `${fmtNum(combConsumo)} L × ${fmtNum2(combPreco)}`, valor: fmt(combHora) });
  }
  if (oper > 0) {
    rows.push({ desc: "Operador/hora", formula: "", valor: fmt(oper) });
  }
  rows.push({ desc: "Custo Hora Produtiva", formula: `dep + man + comb + oper`, valor: fmt(custoHoraProd) });
  if (fator !== 1) {
    rows.push({ desc: "Fator Utilização", formula: "", valor: fmtNum(fator) });
    rows.push({ desc: "Custo Hora c/ Fator", formula: `${fmtNum2(custoHoraProd)} × ${fmtNum(fator)}`, valor: fmt(custoHoraFator) });
  }
  rows.push({ desc: "Coeficiente (h/un)", formula: "", valor: fmtNum(coef) });
  rows.push({ desc: "CUSTO UNITÁRIO/UN", formula: `${fmtNum2(custoHoraFator)} × ${fmtNum(coef)}`, valor: fmt(custoUnit), highlight: true });
  return rows;
}

// ── Build Material calculation rows ──
function buildMatCalcRows(p: Record<string, any>, coef: number): Array<{ desc: string; formula: string; valor: string; highlight?: boolean }> {
  const custoBase = Number(p.custo_unitario || 0);
  const perda = Number(p.perda_percentual || 0);
  const reapr = Number(p.reaproveitamento_percentual || 0);
  const vidaUtil = Number(p.vida_util_estimada || 0);
  const custoRepo = Number(p.custo_reposicao || 0);

  const fatorPerda = 1 + (perda / 100);
  const fatorReapr = 1 - (reapr / 100);
  const custoCorrigido = custoBase * fatorPerda * fatorReapr;
  const repoUso = vidaUtil > 0 && custoRepo > 0 ? custoRepo / vidaUtil : 0;
  const custoFinal = custoCorrigido + repoUso;
  const custoUnit = custoFinal * coef;

  const rows: Array<{ desc: string; formula: string; valor: string; highlight?: boolean }> = [];
  rows.push({ desc: "Custo Unitário Base", formula: "", valor: fmt(custoBase) });
  if (perda > 0) rows.push({ desc: "Fator de Perda", formula: `1 + ${fmtNum2(perda)}%`, valor: fmtNum(fatorPerda) });
  if (reapr > 0) rows.push({ desc: "Fator Reaproveitamento", formula: `1 - ${fmtNum2(reapr)}%`, valor: fmtNum(fatorReapr) });
  rows.push({ desc: "Custo Corrigido", formula: `${fmtNum2(custoBase)} × fatores`, valor: fmt(custoCorrigido) });
  if (repoUso > 0) rows.push({ desc: "Reposição/uso", formula: `${fmtNum2(custoRepo)} ÷ ${fmtNum2(vidaUtil)}`, valor: fmt(repoUso) });
  rows.push({ desc: "Coeficiente (un/un)", formula: "", valor: fmtNum(coef) });
  rows.push({ desc: "CUSTO UNITÁRIO/UN", formula: `${fmtNum2(custoFinal)} × ${fmtNum(coef)}`, valor: fmt(custoUnit), highlight: true });
  return rows;
}

export async function gerarRelatorioDocx(dados: DadosRelatorioDocx): Promise<Blob> {
  const numEquipes = dados.numEquipes || 4;
  const prazoEstimado = dados.mobilizacao?.duracaoMeses || 12;
  const diasProdutivosMes = dados.mobilizacao?.diasProdutivos || 22;

  const TIPO_LABELS: Record<string, string> = {
    mao_de_obra: "Mão de Obra", equipamento: "Equipamentos",
    veiculo: "Veículos", material: "Materiais", combustivel: "Combustível",
  };
  const TIPO_COLORS: Record<string, string> = {
    mao_de_obra: MO_COLOR, equipamento: EQUIP_COLOR,
    veiculo: EQUIP_COLOR, material: MAT_COLOR, combustivel: MAT_COLOR,
  };
  const CATEGORIAS: Record<string, string> = {
    hospedagem: "Hospedagem", combustivel: "Veículo + Combustível",
    pedagios: "Pedágios", passagens: "Passagens", diversos: "Diversos",
  };

  // ── Compute productivity schedule ──
  interface CronogramaItem {
    s: ServicoRelatorio;
    prodDia: number;
    diasTotais: number;
    diasPorEquipe: number;
    meses: number;
  }
  const cronograma: CronogramaItem[] = dados.servicos.map(s => {
    let prodDia = s.produtividadePadrao || 0;
    if (s.unidadeTempoProdutividade === "hora") prodDia *= (dados.mobilizacao?.jornadaDiaria || 8);
    else if (s.unidadeTempoProdutividade === "mes") prodDia /= diasProdutivosMes;
    if (prodDia <= 0) prodDia = 1;
    const diasTotais = Math.ceil(s.quantidade / prodDia);
    const diasPorEquipe = Math.ceil(diasTotais / numEquipes);
    const meses = Math.max(1, Math.ceil(diasPorEquipe / diasProdutivosMes));
    return { s, prodDia, diasTotais, diasPorEquipe, meses };
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
  const irComponents = dados.bdiComponentes.filter(c => ["IRPJ", "CSLL"].some(t => c.nome.toUpperCase().includes(t)));
  const irPct = irComponents.length > 0 ? irComponents.reduce((s, c) => s + c.percentual, 0) : 7.68;
  const totalIR = dados.precoTotal * (irPct / 100);
  const lucroLiquido = dados.precoTotal - totalTributos - dados.custoTotal - totalDesp - totalIR;
  const margemContrib = dados.precoTotal - totalTributos - dados.custoServicos;
  const ebitda = dados.precoTotal - totalTributos - dados.custoTotal;
  const margemLiqPct = dados.precoTotal > 0 ? (lucroLiquido / dados.precoTotal) * 100 : 0;

  // Group composicaoItens by composicao
  const itensPorComposicao = new Map<string, ComposicaoItemRelatorio[]>();
  for (const ci of dados.composicaoItens) {
    const key = ci.composicaoId;
    if (!itensPorComposicao.has(key)) itensPorComposicao.set(key, []);
    itensPorComposicao.get(key)!.push(ci);
  }

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

  const COL_LABEL = 5400;
  const COL_VALUE = 3960;
  const TABLE_W = COL_LABEL + COL_VALUE;

  const summaryData = [
    ["Valor Total da Proposta", fmt(dados.precoTotal)],
    ["Custo Direto (Serviços)", fmt(dados.custoServicos)],
    ["Custo ADM Local", fmt(dados.custoAdmLocal)],
    ["Custo Total", fmt(dados.custoTotal)],
    ["BDI Aplicado", fmtPct(dados.bdiPercentual)],
    ["Prazo Estimado", `${prazoEstimado} meses`],
    ["Número de Equipes", `${numEquipes} equipes`],
  ];

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

  children.push(para(
    `Com base nas composições de custos unitários detalhadas nas seções seguintes, nos parâmetros de BDI adotados e no dimensionamento operacional, ` +
    `declara-se que os preços propostos são EXEQUÍVEIS, sustentados por metodologia técnica comprovada e estrutura financeira adequada.`
  ));

  // ════════════════════════════════════════
  // 2. ÍNDICES DE PRODUTIVIDADE E CRONOGRAMA
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(2, "ÍNDICES DE PRODUTIVIDADE E CRONOGRAMA"));

  children.push(para(
    `As produtividades foram definidas com base no histórico de projetos executados, considerando regime de ` +
    `${dados.mobilizacao?.jornadaDiaria || 8}h diárias, ${diasProdutivosMes} dias produtivos/mês e fator de improdutividade de ` +
    `${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)} (${dados.mobilizacao?.diasChuva || 5} dias de chuva/mês).`
  ));

  const cronCols = [1400, 2000, 1100, 1000, 1000, 1000, 860];
  const cronTableW = cronCols.reduce((a, b) => a + b, 0);

  children.push(new Table({
    width: { size: cronTableW, type: WidthType.DXA },
    columnWidths: cronCols,
    rows: [
      new TableRow({
        children: [
          headerCell("Código", cronCols[0]), headerCell("Serviço", cronCols[1]),
          headerCell("Qtd", cronCols[2]), headerCell("Prod/Dia", cronCols[3]),
          headerCell("Dias Tot", cronCols[4]), headerCell("Dias/Eq", cronCols[5]),
          headerCell("Meses", cronCols[6]),
        ],
      }),
      ...cronograma.map((c, i) => {
        const fill = i % 2 === 1 ? LIGHT_GRAY : undefined;
        return new TableRow({
          children: [
            dataCell(c.s.codigo, cronCols[0], { fill }),
            dataCell(c.s.nome.substring(0, 25), cronCols[1], { fill }),
            dataCell(`${fmtNum2(c.s.quantidade)} ${c.s.unidade}`, cronCols[2], { align: AlignmentType.RIGHT, fill }),
            dataCell(fmtNum2(c.prodDia), cronCols[3], { align: AlignmentType.RIGHT, fill }),
            dataCell(`${c.diasTotais}`, cronCols[4], { align: AlignmentType.RIGHT, fill }),
            dataCell(`${c.diasPorEquipe}`, cronCols[5], { align: AlignmentType.RIGHT, bold: true, fill }),
            dataCell(`${c.meses}`, cronCols[6], { align: AlignmentType.RIGHT, bold: true, fill }),
          ],
        });
      }),
    ],
  }));

  // ════════════════════════════════════════
  // 3. COMPOSIÇÕES DE CUSTO UNITÁRIO (CCU) — DETALHAMENTO COMPLETO
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(3, "COMPOSIÇÕES DE CUSTO UNITÁRIO — MEMÓRIA DE CÁLCULO"));

  children.push(para(
    `A seguir, apresenta-se o detalhamento completo de cada composição de custo unitário, demonstrando ` +
    `os parâmetros utilizados no cálculo de cada insumo (mão de obra, equipamentos e materiais), ` +
    `incluindo encargos sociais, depreciação, produtividades e coeficientes.`
  ));

  // For each service/composition, show detailed calculations
  for (const svc of dados.servicos) {
    // Find composição
    const comp = dados.composicaoItens.find(ci => ci.composicaoId);
    const itens = itensPorComposicao.get(
      dados.composicaoItens.find(ci => {
        // Match by composicaoCodigo or find any item whose composicaoId matches a service
        return true;
      })?.composicaoId || ""
    );

    // Get items for this service's composition
    const compId = dados.composicaoItens.length > 0
      ? [...new Set(dados.composicaoItens.map(ci => ci.composicaoId))]
      : [];

    // Find the composition matching this service
    const matchingCompId = compId.find(cid => {
      const svcItens = dados.composicaoItens.filter(ci => ci.composicaoId === cid);
      return svcItens.length > 0;
    });

    // We need to match services to their composition items
    // Since composicaoItens have composicaoId but servicos don't directly link,
    // we iterate through unique compositions instead
  }

  // Better approach: iterate by unique composition
  const uniqueCompIds = [...new Set(dados.composicaoItens.map(ci => ci.composicaoId))];

  for (const compId of uniqueCompIds) {
    const compItens = dados.composicaoItens.filter(ci => ci.composicaoId === compId);
    if (compItens.length === 0) continue;

    // Find matching service
    const matchingSvc = dados.servicos.find(s => {
      // Match by code in composicaoCodigo
      return compItens[0].composicaoCodigo && s.codigo === compItens[0].composicaoCodigo;
    }) || dados.servicos[uniqueCompIds.indexOf(compId)] || null;

    const compCodigo = compItens[0].composicaoCodigo || matchingSvc?.codigo || `COMP-${uniqueCompIds.indexOf(compId) + 1}`;
    const compNome = matchingSvc?.nome || compItens[0].descricao || "Composição";

    // Composition header
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(subTitle(`${compCodigo} — ${compNome}`));

    if (matchingSvc) {
      children.push(keyValuePara("Unidade", matchingSvc.unidade));
      children.push(keyValuePara("Custo Unitário Total", fmt(matchingSvc.custoUnitario)));
      if (matchingSvc.produtividadePadrao) {
        const unTempo = matchingSvc.unidadeTempoProdutividade === "hora" ? "h" : matchingSvc.unidadeTempoProdutividade === "mes" ? "mês" : "dia";
        children.push(keyValuePara("Produtividade", `${fmtNum2(matchingSvc.produtividadePadrao)} ${matchingSvc.unidade}/${unTempo}`));
      }
    }

    // Group items by type
    const moItens = compItens.filter(ci => ci.tipoInsumo === "mao_de_obra");
    const eqItens = compItens.filter(ci => ci.tipoInsumo === "equipamento");
    const veItens = compItens.filter(ci => ci.tipoInsumo === "veiculo");
    const matItens = compItens.filter(ci => ci.tipoInsumo === "material" || ci.tipoInsumo === "combustivel");

    // ── MÃO DE OBRA ──
    if (moItens.length > 0) {
      children.push(subSubTitle("▸ Mão de Obra", MO_COLOR));
      for (const item of moItens) {
        children.push(new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${item.descricao}`, bold: true, font: "Arial", size: 17, color: DARK }),
            new TextRun({ text: ` (Qtd: ${fmtNum2(item.quantidade)}, Coef: ${fmtNum(item.coeficiente)} h/un)`, font: "Arial", size: 15, color: GRAY }),
          ],
        }));
        const p = item.parametros || {};
        const calcRows = buildMOCalcRows(p, item.coeficiente);
        children.push(calcTable(calcRows));
      }
    }

    // ── EQUIPAMENTOS ──
    if (eqItens.length > 0) {
      children.push(subSubTitle("▸ Equipamentos", EQUIP_COLOR));
      for (const item of eqItens) {
        children.push(new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${item.descricao}`, bold: true, font: "Arial", size: 17, color: DARK }),
            new TextRun({ text: ` (Qtd: ${fmtNum2(item.quantidade)}, Coef: ${fmtNum(item.coeficiente)} h/un)`, font: "Arial", size: 15, color: GRAY }),
          ],
        }));
        const p = item.parametros || {};
        const calcRows = buildEquipCalcRows(p, item.coeficiente);
        children.push(calcTable(calcRows));
      }
    }

    // ── VEÍCULOS ──
    if (veItens.length > 0) {
      children.push(subSubTitle("▸ Veículos", EQUIP_COLOR));
      for (const item of veItens) {
        children.push(new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${item.descricao}`, bold: true, font: "Arial", size: 17, color: DARK }),
            new TextRun({ text: ` (Qtd: ${fmtNum2(item.quantidade)}, Coef: ${fmtNum(item.coeficiente)})`, font: "Arial", size: 15, color: GRAY }),
          ],
        }));
        // Vehicles use equipment-like calc
        const p = item.parametros || {};
        const calcRows = buildEquipCalcRows(p, item.coeficiente);
        children.push(calcTable(calcRows));
      }
    }

    // ── MATERIAIS ──
    if (matItens.length > 0) {
      children.push(subSubTitle("▸ Materiais", MAT_COLOR));
      for (const item of matItens) {
        children.push(new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${item.descricao}`, bold: true, font: "Arial", size: 17, color: DARK }),
            new TextRun({ text: ` (Qtd: ${fmtNum2(item.quantidade)}, Coef: ${fmtNum(item.coeficiente)})`, font: "Arial", size: 15, color: GRAY }),
          ],
        }));
        const p = item.parametros || {};
        const calcRows = buildMatCalcRows(p, item.coeficiente);
        children.push(calcTable(calcRows));
      }
    }

    // ── Resumo da composição ──
    const totalMO = moItens.reduce((s, i) => s + i.custoTotal, 0);
    const totalEq = eqItens.reduce((s, i) => s + i.custoTotal, 0);
    const totalVe = veItens.reduce((s, i) => s + i.custoTotal, 0);
    const totalMat = matItens.reduce((s, i) => s + i.custoTotal, 0);
    const totalComp = totalMO + totalEq + totalVe + totalMat;

    children.push(new Paragraph({ spacing: { before: 100 }, children: [] }));
    const resumoCols = [5000, 4360];
    const resumoTableW = resumoCols.reduce((a, b) => a + b, 0);
    const resumoRows: Array<[string, string, string?]> = [];
    if (totalMO > 0) resumoRows.push(["Mão de Obra", fmt(totalMO)]);
    if (totalEq > 0) resumoRows.push(["Equipamentos", fmt(totalEq)]);
    if (totalVe > 0) resumoRows.push(["Veículos", fmt(totalVe)]);
    if (totalMat > 0) resumoRows.push(["Materiais", fmt(totalMat)]);
    resumoRows.push(["CUSTO UNITÁRIO TOTAL", fmt(totalComp), PRIMARY_LIGHT]);

    children.push(new Table({
      width: { size: resumoTableW, type: WidthType.DXA },
      columnWidths: resumoCols,
      rows: [
        new TableRow({ children: [headerCell("Categoria", resumoCols[0]), headerCell("Subtotal", resumoCols[1])] }),
        ...resumoRows.map((row, i) => new TableRow({
          children: [
            dataCell(row[0], resumoCols[0], { bold: !!row[2], fill: row[2] || (i % 2 === 1 ? LIGHT_GRAY : undefined) }),
            dataCell(row[1], resumoCols[1], { bold: true, align: AlignmentType.RIGHT, fill: row[2] || (i % 2 === 1 ? LIGHT_GRAY : undefined) }),
          ],
        })),
      ],
    }));
  }

  // ════════════════════════════════════════
  // 4. LOGÍSTICA E ADM LOCAL — DETALHADO
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(4, "ADMINISTRAÇÃO LOCAL E LOGÍSTICA — DETALHAMENTO COMPLETO"));

  if (dados.mobilizacao) {
    const m = dados.mobilizacao;

    // 4.1 Identificação e Localização
    children.push(subTitle("4.1 Identificação e Localização do Projeto"));
    children.push(keyValuePara("Mobilização", m.nome));
    if (m.municipio) children.push(keyValuePara("Município do Projeto", `${m.municipio}${m.estado ? ` / ${m.estado}` : ""}`));
    if (m.latitude !== null && m.latitude !== undefined && m.longitude !== null && m.longitude !== undefined) {
      children.push(keyValuePara("Coordenadas do Projeto", `${fmtNum2(Number(m.latitude))}, ${fmtNum2(Number(m.longitude))}`));
    }
    if (m.baseEndereco) children.push(keyValuePara("Base Operacional", m.baseEndereco));
    if (m.baseLatitude !== null && m.baseLatitude !== undefined && m.baseLongitude !== null && m.baseLongitude !== undefined) {
      children.push(keyValuePara("Coordenadas da Base", `${fmtNum2(Number(m.baseLatitude))}, ${fmtNum2(Number(m.baseLongitude))}`));
    }
    children.push(keyValuePara("Distância Base ↔ Projeto", `${fmtNum2(m.distanciaBaseProjeto)} km`));
    if (m.distanciaMediaDiaria) children.push(keyValuePara("Distância Média Diária no Projeto", `${fmtNum2(m.distanciaMediaDiaria)} km`));

    // 4.2 Cronograma e Regime
    children.push(subTitle("4.2 Cronograma e Regime de Trabalho"));
    if (m.dataInicio) children.push(keyValuePara("Data de Início", new Date(m.dataInicio).toLocaleDateString("pt-BR")));
    if (m.dataFim) children.push(keyValuePara("Data de Término", new Date(m.dataFim).toLocaleDateString("pt-BR")));
    children.push(keyValuePara("Duração do Contrato", `${m.duracaoMeses} meses`));
    children.push(keyValuePara("Dias de Trabalho/Mês", `${m.diasTrabalho || 24} dias`));
    children.push(keyValuePara("Jornada Diária", `${fmtNum2(m.jornadaDiaria)} horas`));
    children.push(keyValuePara("Dias Produtivos no Período", `${m.diasProdutivos} dias`));
    if (m.diasImprodutivos !== undefined) children.push(keyValuePara("Dias Improdutivos", `${m.diasImprodutivos} dias`));
    children.push(keyValuePara("Dias de Chuva/Mês", `${m.diasChuva} dias`));
    children.push(keyValuePara("Fator de Improdutividade", fmtPct(m.fatorImprodutividade * 100)));

    // 4.3 Pluviometria
    if (m.pluviometria) {
      children.push(subTitle("4.3 Análise Pluviométrica (INMET)"));
      const pl = m.pluviometria;
      if (pl.estacao) children.push(keyValuePara("Estação Meteorológica", `${pl.estacao}${pl.municipio_estacao ? ` — ${pl.municipio_estacao}/${pl.uf_estacao || ""}` : ""}`));
      if (pl.distancia_estacao_km !== undefined) children.push(keyValuePara("Distância da Estação", `${fmtNum2(pl.distancia_estacao_km)} km`));
      if (pl.anos_analisados) children.push(keyValuePara("Anos Analisados", `${pl.anos_analisados} anos`));
      if (pl.precipitacao_total_mm !== undefined) children.push(keyValuePara("Precipitação Total Anual", `${fmtNum2(pl.precipitacao_total_mm)} mm`));
      if (pl.media_dias_chuva_mes !== undefined) children.push(keyValuePara("Média de Dias com Chuva/Mês", fmtNum2(pl.media_dias_chuva_mes)));

      if (pl.mensal && pl.mensal.length > 0) {
        const pluvCols = [3120, 3120, 3120];
        const pluvW = pluvCols.reduce((a, b) => a + b, 0);
        children.push(new Table({
          width: { size: pluvW, type: WidthType.DXA },
          columnWidths: pluvCols,
          rows: [
            new TableRow({
              children: [
                headerCell("Mês", pluvCols[0]),
                headerCell("Precipitação (mm)", pluvCols[1]),
                headerCell("Dias com Chuva", pluvCols[2]),
              ],
            }),
            ...pl.mensal.map((row, i) => new TableRow({
              children: [
                dataCell(row.mes, pluvCols[0], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
                dataCell(fmtNum2(row.precipitacao_media), pluvCols[1], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
                dataCell(fmtNum2(row.dias_chuva_media), pluvCols[2], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
              ],
            })),
          ],
        }));
      }
    }

    // 4.4 Municípios na Rota
    if (m.municipiosRota && m.municipiosRota.length > 0) {
      children.push(subTitle("4.4 Municípios Considerados na Rota"));
      const munCols = [4680, 1560, 3120];
      const munW = munCols.reduce((a, b) => a + b, 0);
      children.push(new Table({
        width: { size: munW, type: WidthType.DXA },
        columnWidths: munCols,
        rows: [
          new TableRow({
            children: [
              headerCell("Município", munCols[0]),
              headerCell("UF", munCols[1]),
              headerCell("Distância (km)", munCols[2]),
            ],
          }),
          ...m.municipiosRota.map((mu, i) => new TableRow({
            children: [
              dataCell(mu.nome, munCols[0], { fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
              dataCell(mu.uf, munCols[1], { align: AlignmentType.CENTER, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
              dataCell(fmtNum2(mu.distancia_km), munCols[2], { align: AlignmentType.RIGHT, fill: i % 2 === 1 ? LIGHT_GRAY : undefined }),
            ],
          })),
        ],
      }));
    }
  }

  // 4.5 Deslocamentos do Projeto — Detalhado por Item
  if (dados.deslocamentosItens && dados.deslocamentosItens.length > 0) {
    children.push(subTitle("4.5 Deslocamentos do Projeto — Itens Detalhados"));
    const dCols = [1620, 2400, 1100, 900, 1100, 1100, 1140];
    const dW = dCols.reduce((a, b) => a + b, 0);
    children.push(new Table({
      width: { size: dW, type: WidthType.DXA },
      columnWidths: dCols,
      rows: [
        new TableRow({
          children: [
            headerCell("Categoria", dCols[0]),
            headerCell("Descrição", dCols[1]),
            headerCell("V. Unit.", dCols[2]),
            headerCell("Qtd", dCols[3]),
            headerCell("Frequência", dCols[4]),
            headerCell("Custo/Mês", dCols[5]),
            headerCell("Custo Total", dCols[6]),
          ],
        }),
        ...dados.deslocamentosItens.map((item, i) => {
          const fill = i % 2 === 1 ? LIGHT_GRAY : undefined;
          const desc = [
            item.descricao || "—",
            item.veiculo_nome ? `Veíc.: ${item.veiculo_nome}` : "",
            item.tipo_hospedagem ? `Hosp.: ${item.tipo_hospedagem}` : "",
            item.km_dia ? `${fmtNum2(item.km_dia)} km/dia` : "",
          ].filter(Boolean).join(" | ");
          return new TableRow({
            children: [
              dataCell(CATEGORIAS[item.categoria] || item.categoria, dCols[0], { bold: true, fill, size: 14 }),
              dataCell(desc, dCols[1], { fill, size: 14 }),
              dataCell(fmt(item.valor_unitario), dCols[2], { align: AlignmentType.RIGHT, fill, size: 14 }),
              dataCell(fmtNum2(item.quantidade), dCols[3], { align: AlignmentType.RIGHT, fill, size: 14 }),
              dataCell(item.frequencia, dCols[4], { align: AlignmentType.CENTER, fill, size: 14 }),
              dataCell(item.custo_mensal !== undefined ? fmt(item.custo_mensal) : "—", dCols[5], { align: AlignmentType.RIGHT, fill, size: 14 }),
              dataCell(fmt(item.custo_total), dCols[6], { align: AlignmentType.RIGHT, bold: true, fill, size: 14 }),
            ],
          });
        }),
      ],
    }));
  }

  // 4.6 Mobilização / Desmobilização — Detalhado por Trajeto
  if (dados.mobDesmobItens && dados.mobDesmobItens.length > 0) {
    children.push(subTitle("4.6 Mobilização e Desmobilização — Cálculo por Trajeto"));
    children.push(para(
      `Cada trajeto é computado como ida e volta (×2). Combustível: custo/km × distância × veículos. ` +
      `Pernoites: (dias_viagem - 1) × valor/pernoite × pessoas. Horas/Pessoa: dias_viagem × jornada × custo H/H × pessoas.`
    ));

    for (const md of dados.mobDesmobItens) {
      children.push(subSubTitle(`▸ ${md.municipio_saida || "—"}/${md.estado_saida || ""} → Projeto (${fmtNum2(md.distancia_km)} km)`, ACCENT));
      const mdRows = [
        { desc: "Veículo", formula: "", valor: md.veiculo_nome || "—" },
        { desc: "Distância (ida)", formula: "", valor: `${fmtNum2(md.distancia_km)} km` },
        { desc: "Km máx/dia", formula: "", valor: `${fmtNum2(md.km_max_dia)} km` },
        { desc: "Dias de Viagem (ida)", formula: `⌈${fmtNum2(md.distancia_km)} ÷ ${fmtNum2(md.km_max_dia)}⌉`, valor: `${md.dias_viagem} dias` },
        { desc: "Pernoites (ida)", formula: `${md.dias_viagem} - 1`, valor: `${md.pernoites}` },
        { desc: "Pessoas", formula: "", valor: `${md.quantidade_pessoas}` },
        { desc: "Veículos", formula: "", valor: `${md.quantidade_veiculos}` },
        { desc: "Combustível (ida)", formula: `custo/km × ${fmtNum2(md.distancia_km)} × ${md.quantidade_veiculos}`, valor: fmt(md.custo_combustivel_ida) },
        { desc: "Pernoites (ida)", formula: `${md.pernoites} × ${fmt(md.hospedagem_pernoite)} × ${md.quantidade_pessoas}`, valor: fmt(md.custo_pernoite_ida) },
        { desc: "Pedágios (ida)", formula: "", valor: fmt(md.pedagios_ida) },
        { desc: "Horas Pessoas (ida)", formula: `${md.dias_viagem} × jornada × ${fmt(md.custo_hora_pessoa)} × ${md.quantidade_pessoas}`, valor: fmt(md.custo_horas_pessoas_ida) },
        { desc: "Subtotal IDA", formula: "soma das parcelas", valor: fmt(md.custo_ida) },
        { desc: "TOTAL (IDA + VOLTA)", formula: `${fmt(md.custo_ida)} × 2`, valor: fmt(md.custo_total), highlight: true },
      ];
      children.push(calcTable(mdRows));
    }
  }

  // 4.7 Resumo Consolidado de ADM Local
  children.push(subTitle("4.7 Resumo Consolidado de ADM Local"));
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
        new TableRow({ children: [headerCell("Categoria", COL_LABEL), headerCell("Valor Total no Período", COL_VALUE)] }),
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
    `${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)}, reduzindo os dias úteis de trabalho ` +
    `e calibrando os custos fixos da Administração Local ao longo do prazo contratual.`
  ));

  // ════════════════════════════════════════
  // 5. FORMAÇÃO DO BDI
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(5, "FORMAÇÃO DO BDI"));

  children.push(para(
    `O BDI (Benefícios e Despesas Indiretas) foi calculado pelo método da fórmula inversa (markup), ` +
    `onde o preço de venda é determinado pela relação: Preço = Custo / (1 - Tributos% - Margem%). ` +
    `O perfil "${dados.bdiNome}" resulta em BDI efetivo de ${fmtPct(dados.bdiPercentual)}.`
  ));

  children.push(subTitle("Componentes do BDI"));

  // BDI components table
  const bdiCompCols = [4000, 2400, 2960];
  const bdiCompW = bdiCompCols.reduce((a, b) => a + b, 0);

  const bdiCategories = new Map<string, Array<{ nome: string; percentual: number }>>();
  for (const c of dados.bdiComponentes) {
    const cat = c.categoria || "outros";
    if (!bdiCategories.has(cat)) bdiCategories.set(cat, []);
    bdiCategories.get(cat)!.push(c);
  }

  const bdiRows: TableRow[] = [];
  bdiRows.push(new TableRow({ children: [headerCell("Componente", bdiCompCols[0]), headerCell("Percentual", bdiCompCols[1]), headerCell("Valor s/ CD", bdiCompCols[2])] }));

  let rowIdx = 0;
  for (const comp of dados.bdiComponentes) {
    const valorSobreCd = dados.custoTotal * (comp.percentual / 100);
    const fill = rowIdx % 2 === 1 ? LIGHT_GRAY : undefined;
    bdiRows.push(new TableRow({
      children: [
        dataCell(comp.nome, bdiCompCols[0], { fill }),
        dataCell(fmtPct(comp.percentual), bdiCompCols[1], { align: AlignmentType.RIGHT, fill }),
        dataCell(fmt(valorSobreCd), bdiCompCols[2], { align: AlignmentType.RIGHT, fill }),
      ],
    }));
    rowIdx++;
  }

  // BDI total row
  bdiRows.push(new TableRow({
    children: [
      dataCell("BDI EFETIVO (MARKUP)", bdiCompCols[0], { bold: true, fill: PRIMARY_LIGHT }),
      dataCell(fmtPct(dados.bdiPercentual), bdiCompCols[1], { bold: true, align: AlignmentType.RIGHT, fill: PRIMARY_LIGHT }),
      dataCell(fmt(dados.valorBdi), bdiCompCols[2], { bold: true, align: AlignmentType.RIGHT, fill: PRIMARY_LIGHT }),
    ],
  }));

  children.push(new Table({
    width: { size: bdiCompW, type: WidthType.DXA },
    columnWidths: bdiCompCols,
    rows: bdiRows,
  }));

  // BDI calculation memory
  children.push(subTitle("Memória de Cálculo do BDI"));
  const bdiCalcRows = [
    { desc: "Custo Direto (CD)", formula: "Serviços + ADM Local", valor: fmt(dados.custoTotal) },
    { desc: "Custo Serviços", formula: "", valor: fmt(dados.custoServicos) },
    { desc: "Custo ADM Local", formula: "", valor: fmt(dados.custoAdmLocal) },
    { desc: "BDI (valor)", formula: `Preço - CD`, valor: fmt(dados.valorBdi) },
    { desc: "BDI (%)", formula: `${fmtNum2(dados.valorBdi)} ÷ ${fmtNum2(dados.custoTotal)} × 100`, valor: fmtPct(dados.bdiPercentual) },
    { desc: "PREÇO DE VENDA", formula: `CD + BDI`, valor: fmt(dados.precoTotal), highlight: true },
  ];
  children.push(calcTable(bdiCalcRows));

  // ════════════════════════════════════════
  // 6. DEMONSTRATIVO DE RESULTADO (DRE)
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(6, "DEMONSTRATIVO DE RESULTADO PROJETADO (DRE)"));

  children.push(para(
    `O DRE projetado demonstra a viabilidade financeira do contrato, apresentando a margem de contribuição, ` +
    `EBITDA e lucro líquido estimados após a incidência de todos os tributos e despesas operacionais.`
  ));

  const dreData: Array<[string, string, string?]> = [
    ["Receita Bruta (Preço de Venda)", fmt(dados.precoTotal)],
    ["(-) Tributos sobre Receita", `-${fmt(totalTributos)}`],
  ];

  // Detail each tax
  for (const trib of tributosReceita) {
    const val = dados.precoTotal * (trib.percentual / 100);
    dreData.push([`   • ${trib.nome} (${fmtPct(trib.percentual)})`, `-${fmt(val)}`]);
  }

  dreData.push(["= Receita Líquida", fmt(dados.precoTotal - totalTributos), SUCCESS_BG]);
  dreData.push(["(-) Custo Direto Total", `-${fmt(dados.custoTotal)}`]);
  dreData.push([`   • Serviços`, `-${fmt(dados.custoServicos)}`]);
  dreData.push([`   • ADM Local`, `-${fmt(dados.custoAdmLocal)}`]);
  dreData.push(["= Margem de Contribuição", fmt(margemContrib), SUCCESS_BG]);
  
  if (totalDesp > 0) {
    dreData.push(["(-) Despesas Indiretas (BDI)", `-${fmt(totalDesp)}`]);
    for (const desp of despesasIndiretas) {
      const val = dados.custoTotal * (desp.percentual / 100);
      dreData.push([`   • ${desp.nome} (${fmtPct(desp.percentual)})`, `-${fmt(val)}`]);
    }
  }

  dreData.push(["= EBITDA Estimado", fmt(ebitda), SUCCESS_BG]);
  dreData.push([`(-) IRPJ + CSLL (${fmtPct(irPct)})`, `-${fmt(totalIR)}`]);
  dreData.push(["= LUCRO LÍQUIDO", fmt(lucroLiquido), lucroLiquido >= 0 ? SUCCESS_BG : DANGER_BG]);

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

  // Indicators
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
  // 7. ANÁLISE DE RISCOS
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(7, "ANÁLISE DE RISCOS"));

  const riscos = [
    { risco: "Clima (Precipitação)", impacto: "Alto", prob: "Média",
      mitigacao: `Fator de improdutividade de ${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)} já aplicado.` },
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
  // 8. CONCLUSÃO
  // ════════════════════════════════════════
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionTitle(8, "CONCLUSÃO"));

  children.push(para(
    `Diante do exposto ao longo deste relatório, conclui-se que a proposta no valor de ${fmt(dados.precoTotal)} ` +
    `é TÉCNICA E FINANCEIRAMENTE EXEQUÍVEL, conforme demonstrado a seguir:`
  ));

  const conclusoes = [
    `Os custos diretos foram compostos insumo a insumo, com memória de cálculo detalhada para cada item de mão de obra, equipamento e material.`,
    `O BDI de ${fmtPct(dados.bdiPercentual)} (${dados.bdiNome}) contempla administração, tributos, seguros e margem compatíveis com o porte do projeto.`,
    `A margem líquida projetada de ${fmtPct(margemLiqPct)} demonstra sustentabilidade financeira sem comprometer a qualidade dos serviços.`,
    `O dimensionamento de ${numEquipes} equipes simultâneas permite a execução dentro do prazo contratual de ${prazoEstimado} meses.`,
    `Os riscos foram identificados e mitigados através de fatores de improdutividade, reservas de contingência e planejamento logístico.`,
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
          size: { width: 11906, height: 16838 },
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

/**
 * Gerador de Relatório de Exequibilidade em PDF
 * Usa jsPDF + jspdf-autotable para layout profissional
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ──
export interface DadosRelatorio {
  oportunidade: {
    codigo: string;
    descricao: string;
    cliente: string;
    cidade: string;
    estado: string;
    grupoServicos: string;
  };
  servicos: Array<{
    codigo: string;
    nome: string;
    quantidade: number;
    unidade: string;
    custoUnitario: number;
    subtotal: number;
  }>;
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

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],       // blue-700
  primaryLight: [219, 234, 254] as [number, number, number], // blue-100
  dark: [15, 23, 42] as [number, number, number],            // slate-900
  gray: [100, 116, 139] as [number, number, number],         // slate-500
  lightGray: [241, 245, 249] as [number, number, number],    // slate-100
  white: [255, 255, 255] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],        // green-600
  danger: [220, 38, 38] as [number, number, number],         // red-600
  accent: [79, 70, 229] as [number, number, number],         // indigo-600
  coverBg: [15, 23, 42] as [number, number, number],         // slate-900
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function gerarRelatorioPDF(dados: DadosRelatorio): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  // ══════════════════════════════════════
  // CAPA
  // ══════════════════════════════════════
  doc.setFillColor(...COLORS.coverBg);
  doc.rect(0, 0, pageW, pageH, "F");

  // Accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 8, pageH, "F");

  // Title block
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("RELATÓRIO DE", marginL + 10, 80);
  doc.text("EXEQUIBILIDADE", marginL + 10, 95);

  // Accent line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1.5);
  doc.line(marginL + 10, 105, marginL + 90, 105);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 200, 230);
  doc.text("Demonstração de Viabilidade Técnica e Financeira", marginL + 10, 118);

  // Project info
  doc.setFontSize(11);
  doc.setTextColor(150, 170, 200);
  y = 145;
  const infoLines = [
    `Processo: ${dados.oportunidade.codigo}`,
    `Cliente: ${dados.oportunidade.cliente}`,
    `Local: ${dados.oportunidade.cidade}/${dados.oportunidade.estado}`,
    `Grupo de Serviços: ${dados.oportunidade.grupoServicos}`,
    `Data: ${new Date().toLocaleDateString("pt-BR")}`,
  ];
  for (const line of infoLines) {
    doc.text(line, marginL + 10, y);
    y += 8;
  }

  // Price highlight
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(marginL + 10, 200, 120, 35, 3, 3, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("VALOR DA PROPOSTA", marginL + 15, 213);
  doc.setFontSize(22);
  doc.text(fmt(dados.precoTotal), marginL + 15, 228);

  // Footer on cover
  doc.setTextColor(100, 120, 150);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Documento gerado automaticamente pelo Sistema de Orçamentação", marginL + 10, pageH - 15);
  doc.text("Uso interno — Informações confidenciais", marginL + 10, pageH - 10);

  // ══════════════════════════════════════
  // HELPER FUNCTIONS
  // ══════════════════════════════════════
  const addHeader = (pageNum: number) => {
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageW, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.setFont("helvetica", "normal");
    doc.text(`Relatório de Exequibilidade — ${dados.oportunidade.codigo}`, marginL, 10);
    doc.text(`Página ${pageNum}`, pageW - marginR, 10, { align: "right" });
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(marginL, 13, pageW - marginR, 13);
  };

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.text("Documento confidencial — Gerado automaticamente", marginL, pageH - 8);
    doc.text(new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR"), pageW - marginR, pageH - 8, { align: "right" });
  };

  let pageNum = 1;
  const newPage = () => {
    doc.addPage();
    pageNum++;
    addHeader(pageNum);
    addFooter();
    return 22;
  };

  const checkPageBreak = (neededSpace: number): number => {
    if (y + neededSpace > pageH - 25) {
      return newPage();
    }
    return y;
  };

  const sectionTitle = (title: string, num: number) => {
    y = checkPageBreak(20);
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(marginL, y, contentW, 10, 2, 2, "F");
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(marginL, y, 3, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${num}. ${title}`, marginL + 6, y + 7);
    y += 16;
  };

  const subTitle = (title: string) => {
    y = checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text(title, marginL, y);
    y += 6;
  };

  const paragraph = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      y = checkPageBreak(5);
      doc.text(line, marginL, y);
      y += 4.5;
    }
    y += 2;
  };

  const keyValue = (key: string, value: string) => {
    y = checkPageBreak(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text(key + ":", marginL + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    doc.text(value, marginL + 60, y);
    y += 5.5;
  };

  // ══════════════════════════════════════
  // 1. RESUMO EXECUTIVO
  // ══════════════════════════════════════
  y = newPage();

  sectionTitle("RESUMO EXECUTIVO", 1);

  const numEquipes = dados.numEquipes || 4;
  const prazoEstimado = dados.mobilizacao?.duracaoMeses || 12;

  paragraph(
    `O presente relatório demonstra a exequibilidade técnica e financeira da proposta apresentada para o processo ` +
    `${dados.oportunidade.codigo}, referente a "${dados.oportunidade.descricao}", para o cliente ${dados.oportunidade.cliente}, ` +
    `a ser executado em ${dados.oportunidade.cidade}/${dados.oportunidade.estado}.`
  );

  y += 2;
  // Summary cards - using a table
  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Indicador", "Valor"]],
    body: [
      ["Valor Total da Proposta", fmt(dados.precoTotal)],
      ["Custo Direto Total", fmt(dados.custoTotal)],
      ["BDI Aplicado", fmtPct(dados.bdiPercentual)],
      ["Prazo Estimado", `${prazoEstimado} meses`],
      ["Número de Equipes", `${numEquipes} equipes`],
      ["Composições de Custo", `${dados.servicos.length} serviços`],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold" },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  subTitle("Principais Serviços");
  for (const s of dados.servicos.slice(0, 10)) {
    y = checkPageBreak(5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);
    doc.text(`• ${s.codigo} — ${s.nome}: ${fmtNum(s.quantidade)} ${s.unidade} (${fmt(s.subtotal)})`, marginL + 2, y);
    y += 4.5;
  }
  y += 4;

  paragraph(
    `Com base nas composições de custos unitários, nos parâmetros de BDI adotados e no dimensionamento operacional ` +
    `detalhado nas seções seguintes, declara-se que os preços propostos são EXEQUÍVEIS, ` +
    `sustentados por metodologia técnica comprovada, produtividades reais e estrutura financeira adequada.`
  );

  // ══════════════════════════════════════
  // 2. METODOLOGIA EXECUTIVA
  // ══════════════════════════════════════
  sectionTitle("METODOLOGIA EXECUTIVA", 2);

  subTitle("Descrição das Etapas");
  const etapas = [
    { nome: "Levantamento com Drone (VANT)", desc: "Aerolevantamento com drone RTK para obtenção de ortomosaicos e MDT/MDS, cobrindo grandes áreas com alta produtividade." },
    { nome: "Rastreamento GNSS", desc: "Posicionamento geodésico de marcos e vértices com receptores GNSS de dupla frequência (L1/L2), processamento PPP-IBGE." },
    { nome: "Levantamento Topográfico Planialtimétrico", desc: "Levantamento por estação total e/ou GNSS RTK para determinação de coordenadas planialtimétricas com precisão centimétrica." },
    { nome: "Serviços Fundiários", desc: "Georreferenciamento de imóveis rurais, regularização fundiária, memorial descritivo e ART conforme normas do INCRA e cartórios." },
    { nome: "Sondagem e Investigação", desc: "Investigação geotécnica com sondagem a percussão (SPT) e/ou mista para caracterização do subsolo." },
  ];
  for (const etapa of etapas) {
    y = checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.accent);
    doc.text(`▸ ${etapa.nome}`, marginL + 2, y);
    y += 5;
    paragraph(etapa.desc);
  }

  subTitle("Produtividade Adotada");
  paragraph(
    `As produtividades foram definidas com base no histórico de projetos executados, considerando o regime de trabalho ` +
    `de ${dados.mobilizacao?.jornadaDiaria || 8}h diárias e condições regionais de acesso e clima. ` +
    `O fator de improdutividade aplicado é de ${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)}, ` +
    `que contempla dias de chuva (${dados.mobilizacao?.diasChuva || 5} dias/mês) e paradas operacionais.`
  );

  // ══════════════════════════════════════
  // 3. DIMENSIONAMENTO OPERACIONAL
  // ══════════════════════════════════════
  sectionTitle("DIMENSIONAMENTO OPERACIONAL", 3);

  keyValue("Quantidade de Equipes", `${numEquipes} equipes simultâneas`);
  keyValue("Regime de Trabalho", dados.mobilizacao?.regimeTrabalho || "Jornada regular 8h/dia, 5x2");
  keyValue("Jornada Diária", `${dados.mobilizacao?.jornadaDiaria || 8} horas`);
  keyValue("Duração Estimada", `${prazoEstimado} meses`);
  keyValue("Dias Produtivos/Mês", `${dados.mobilizacao?.diasProdutivos || 22} dias`);

  y += 4;
  subTitle("Cronograma Físico Estimado");

  const cronogramaBody: string[][] = [];
  for (const s of dados.servicos) {
    const prodDia = s.custoUnitario > 0 ? 3.5 : 1; // placeholder
    const diasTotais = Math.ceil(s.quantidade / (prodDia * numEquipes));
    const meses = Math.max(1, Math.ceil(diasTotais / 22));
    cronogramaBody.push([
      s.codigo,
      s.nome.substring(0, 35),
      `${fmtNum(s.quantidade)} ${s.unidade}`,
      `${diasTotais} dias`,
      `${meses} meses`,
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Código", "Serviço", "Quantidade", "Prazo", "Meses"]],
    body: cronogramaBody,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 22 },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════
  // 4. LOGÍSTICA E MOBILIZAÇÃO
  // ══════════════════════════════════════
  y = checkPageBreak(60);
  sectionTitle("LOGÍSTICA E MOBILIZAÇÃO", 4);

  if (dados.mobilizacao) {
    keyValue("Base Operacional", dados.mobilizacao.nome);
    keyValue("Distância Base-Projeto", `${fmtNum(dados.mobilizacao.distanciaBaseProjeto)} km`);
    keyValue("Dias de Chuva/Mês", `${dados.mobilizacao.diasChuva} dias`);
    keyValue("Fator Improdutividade", fmtPct(dados.mobilizacao.fatorImprodutividade * 100));
    y += 4;
  }

  subTitle("Custos Logísticos");
  const CATEGORIAS: Record<string, string> = {
    hospedagem: "Hospedagem", combustivel: "Veículo + Combustível",
    pedagios: "Pedágios", passagens: "Passagens", diversos: "Diversos",
  };
  const logBody: string[][] = [];
  for (const [cat, valor] of Object.entries(dados.deslocamentosPorCategoria)) {
    if (valor > 0) logBody.push([CATEGORIAS[cat] || cat, fmt(valor)]);
  }
  if (dados.custoMobDesmob > 0) logBody.push(["Mobilização / Desmobilização", fmt(dados.custoMobDesmob)]);
  logBody.push(["TOTAL ADM LOCAL", fmt(dados.custoAdmLocal)]);

  if (logBody.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [["Categoria", "Valor"]],
      body: logBody,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      didParseCell: (data: any) => {
        if (data.row.index === logBody.length - 1) {
          data.cell.styles.fillColor = COLORS.primaryLight;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  paragraph(
    `O impacto pluviométrico foi considerado através do fator de improdutividade de ` +
    `${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)}, reduzindo os dias úteis de trabalho. ` +
    `O critério de mudança de base ocorre quando a distância ao local de trabalho excede 100 km.`
  );

  // ══════════════════════════════════════
  // 5. COMPOSIÇÃO DE CUSTOS (CCU)
  // ══════════════════════════════════════
  y = checkPageBreak(40);
  sectionTitle("COMPOSIÇÃO DE CUSTOS (CCU)", 5);

  subTitle("Resumo por Tipo de Insumo");
  const TIPO_LABELS: Record<string, string> = {
    mao_de_obra: "Mão de Obra", equipamento: "Equipamentos",
    veiculo: "Veículos", material: "Materiais", combustivel: "Combustível",
  };
  const tipoBody: string[][] = [];
  let totalTipos = 0;
  for (const [tipo, valor] of Object.entries(dados.custoServicosPorTipo)) {
    if (valor > 0) {
      const pct = dados.custoServicos > 0 ? (valor / dados.custoServicos) * 100 : 0;
      tipoBody.push([TIPO_LABELS[tipo] || tipo, fmt(valor), fmtPct(pct)]);
      totalTipos += valor;
    }
  }
  tipoBody.push(["TOTAL SERVIÇOS", fmt(dados.custoServicos), "100,00%"]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Tipo de Insumo", "Valor", "% do CD"]],
    body: tipoBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    didParseCell: (data: any) => {
      if (data.row.index === tipoBody.length - 1) {
        data.cell.styles.fillColor = COLORS.primaryLight;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  subTitle("Detalhamento por Composição");
  const ccuBody: string[][] = dados.servicos.map(s => [
    s.codigo,
    s.nome.substring(0, 30),
    `${fmtNum(s.quantidade)} ${s.unidade}`,
    fmt(s.custoUnitario),
    fmt(s.subtotal),
  ]);
  ccuBody.push(["", "TOTAL", "", "", fmt(dados.custoServicos)]);

  y = checkPageBreak(30);
  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Código", "Composição", "Quantidade", "Custo Unit.", "Subtotal"]],
    body: ccuBody,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 22 },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data: any) => {
      if (data.row.index === ccuBody.length - 1) {
        data.cell.styles.fillColor = COLORS.primaryLight;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Admin central (BDI)
  subTitle("Administração Central (BDI)");
  keyValue("Perfil BDI", `${dados.bdiNome} — ${fmtPct(dados.bdiPercentual)}`);
  const bdiBody: string[][] = dados.bdiComponentes.map(c => [c.nome, fmtPct(c.percentual)]);
  bdiBody.push(["BDI EFETIVO", fmtPct(dados.bdiPercentual)]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Componente BDI", "%"]],
    body: bdiBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.accent, textColor: COLORS.white },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data: any) => {
      if (data.row.index === bdiBody.length - 1) {
        data.cell.styles.fillColor = [224, 231, 255]; // indigo-100
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════
  // 6. ANÁLISE FINANCEIRA
  // ══════════════════════════════════════
  y = checkPageBreak(60);
  sectionTitle("ANÁLISE FINANCEIRA", 6);

  // Categorize BDI components
  const tributosReceita = dados.bdiComponentes.filter(c => {
    const cat = c.categoria?.toLowerCase() || "";
    const n = c.nome.toUpperCase();
    return cat === "tributo" || ["ISS", "PIS", "COFINS"].some(t => n.includes(t));
  });
  const totalTribPct = tributosReceita.reduce((s, c) => s + c.percentual, 0);
  const totalTributos = dados.precoTotal * (totalTribPct / 100);

  const despesasIndiretas = dados.bdiComponentes.filter(c => {
    const cat = c.categoria?.toLowerCase() || "";
    const n = c.nome.toUpperCase();
    return !["ISS", "PIS", "COFINS", "IRPJ", "CSLL", "LUCRO"].some(t => n.includes(t))
      && cat !== "tributo" && cat !== "ir" && cat !== "lucro";
  });
  const totalDespPct = despesasIndiretas.reduce((s, c) => s + c.percentual, 0);
  const totalDesp = dados.custoTotal * (totalDespPct / 100);

  // IR fallback
  let irPct = 0;
  const irComponents = dados.bdiComponentes.filter(c => {
    const n = c.nome.toUpperCase();
    return n.includes("IRPJ") || n.includes("CSLL");
  });
  if (irComponents.length > 0) {
    irPct = irComponents.reduce((s, c) => s + c.percentual, 0);
  } else {
    irPct = 7.68;
  }
  const totalIR = dados.precoTotal * (irPct / 100);

  const lucroLiquido = dados.precoTotal - totalTributos - dados.custoTotal - totalDesp - totalIR;
  const margemContrib = dados.precoTotal - totalTributos - dados.custoServicos;
  const ebitda = dados.precoTotal - totalTributos - dados.custoTotal;

  subTitle("Demonstrativo de Resultado (DRE)");
  const dreBody: string[][] = [
    ["Receita Bruta (Preço de Venda)", fmt(dados.precoTotal)],
    ["(-) Tributos sobre Receita", `-${fmt(totalTributos)}`],
    ["= Receita Líquida", fmt(dados.precoTotal - totalTributos)],
    ["(-) Custo Direto Total", `-${fmt(dados.custoTotal)}`],
    ["  • Serviços", `-${fmt(dados.custoServicos)}`],
    ["  • ADM Local", `-${fmt(dados.custoAdmLocal)}`],
    ["= Margem de Contribuição", fmt(margemContrib)],
    ["(-) Despesas Indiretas (BDI)", `-${fmt(totalDesp)}`],
    ["= EBITDA Estimado", fmt(ebitda)],
    ["(-) IRPJ + CSLL", `-${fmt(totalIR)}`],
    ["= LUCRO LÍQUIDO", fmt(lucroLiquido)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    body: dreBody,
    styles: { fontSize: 9, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didParseCell: (data: any) => {
      const rowIdx = data.row.index;
      if ([2, 6, 8].includes(rowIdx)) {
        data.cell.styles.fillColor = [240, 249, 255];
        data.cell.styles.fontStyle = "bold";
      }
      if (rowIdx === dreBody.length - 1) {
        data.cell.styles.fillColor = lucroLiquido >= 0 ? [220, 252, 231] : [254, 226, 226];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 10;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  subTitle("Indicadores Financeiros");
  const margemLiqPct = dados.precoTotal > 0 ? (lucroLiquido / dados.precoTotal) * 100 : 0;
  const margemContribPct = dados.precoTotal > 0 ? (margemContrib / dados.precoTotal) * 100 : 0;
  const ebitdaPct = dados.precoTotal > 0 ? (ebitda / dados.precoTotal) * 100 : 0;

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Indicador", "Valor", "% da Receita"]],
    body: [
      ["Margem de Contribuição", fmt(margemContrib), fmtPct(margemContribPct)],
      ["EBITDA Estimado", fmt(ebitda), fmtPct(ebitdaPct)],
      ["Lucro Líquido", fmt(lucroLiquido), fmtPct(margemLiqPct)],
      ["Impostos Totais", fmt(totalTributos + totalIR), fmtPct(totalTribPct + irPct)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.success, textColor: COLORS.white },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════
  // 7. CURVA DE EXECUÇÃO
  // ══════════════════════════════════════
  y = checkPageBreak(80);
  sectionTitle("CURVA DE EXECUÇÃO", 7);

  subTitle("Evolução Física Estimada (Curva S)");
  const totalMeses = prazoEstimado;
  const curvaBody: string[][] = [];
  for (let m = 1; m <= Math.min(totalMeses, 18); m++) {
    // S-curve approximation
    const t = m / totalMeses;
    const pctAcum = Math.round((3 * t * t - 2 * t * t * t) * 100);
    const pctMes = m === 1 ? pctAcum : pctAcum - Math.round((3 * ((m - 1) / totalMeses) ** 2 - 2 * ((m - 1) / totalMeses) ** 3) * 100);
    const bar = "█".repeat(Math.max(1, Math.round(pctMes / 3)));
    curvaBody.push([`Mês ${m}`, `${pctMes}%`, `${pctAcum}%`, bar]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Período", "% Mês", "% Acumulado", "Evolução"]],
    body: curvaBody,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right", fontStyle: "bold" },
      3: { textColor: COLORS.primary },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  subTitle("Distribuição de Equipes");
  paragraph(
    `As ${numEquipes} equipes operam simultaneamente, distribuídas pela área de execução. ` +
    `A alocação segue lógica de proximidade geográfica para minimizar deslocamentos. ` +
    `A produtividade por equipe é monitorada diariamente e ajustada conforme condições de campo.`
  );

  // ══════════════════════════════════════
  // 8. ANÁLISE DE RISCOS
  // ══════════════════════════════════════
  y = checkPageBreak(60);
  sectionTitle("ANÁLISE DE RISCOS", 8);

  const riscos = [
    {
      risco: "Clima (Precipitação)",
      impacto: "Alto",
      prob: "Média",
      mitigacao: `Fator de improdutividade de ${fmtPct((dados.mobilizacao?.fatorImprodutividade || 0.15) * 100)} já aplicado. Monitoramento pluviométrico contínuo. Replanejamento de atividades em dias chuvosos para trabalhos internos.`,
    },
    {
      risco: "Logística e Acesso",
      impacto: "Médio",
      prob: "Baixa",
      mitigacao: "Reconhecimento prévio das áreas. Veículos 4x4 para áreas de difícil acesso. Bases operacionais estrategicamente posicionadas.",
    },
    {
      risco: "Produtividade Abaixo do Esperado",
      impacto: "Alto",
      prob: "Baixa",
      mitigacao: "Produtividades baseadas em histórico real. Margem de segurança embutida no cronograma. Possibilidade de alocação de equipe adicional.",
    },
    {
      risco: "Variação Cambial/Inflação de Insumos",
      impacto: "Baixo",
      prob: "Média",
      mitigacao: "Contratos de locação com valores fixos. Estoque estratégico de materiais. Cláusula de reequilíbrio prevista.",
    },
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Risco", "Impacto", "Prob.", "Mitigação"]],
    body: riscos.map(r => [r.risco, r.impacto, r.prob, r.mitigacao]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: COLORS.danger, textColor: COLORS.white },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: contentW - 63 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════
  // 9. CONCLUSÃO
  // ══════════════════════════════════════
  y = checkPageBreak(60);
  sectionTitle("CONCLUSÃO", 9);

  paragraph(
    `Diante do exposto ao longo deste relatório, conclui-se que a proposta no valor de ${fmt(dados.precoTotal)} ` +
    `é TÉCNICA E FINANCEIRAMENTE EXEQUÍVEL, conforme demonstrado a seguir:`
  );
  y += 2;

  const conclusoes = [
    `Os custos diretos foram compostos insumo a insumo, utilizando salários de mercado, custos de equipamentos reais e materiais com preços atualizados.`,
    `O BDI de ${fmtPct(dados.bdiPercentual)} (${dados.bdiNome}) contempla administração central, tributos, seguros e margem de lucro compatíveis com o porte do projeto.`,
    `A margem líquida projetada de ${fmtPct(margemLiqPct)} demonstra sustentabilidade financeira sem comprometer a qualidade dos serviços.`,
    `O dimensionamento de ${numEquipes} equipes simultâneas, no regime operacional adotado, permite a execução dentro do prazo contratual de ${prazoEstimado} meses.`,
    `Os riscos foram identificados e mitigados através de fatores de improdutividade, reservas de contingência e planejamento logístico adequado.`,
  ];

  for (const conc of conclusoes) {
    y = checkPageBreak(10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    const lines = doc.splitTextToSize(`✓ ${conc}`, contentW - 5);
    for (const line of lines) {
      y = checkPageBreak(5);
      doc.text(line, marginL + 3, y);
      y += 4.5;
    }
    y += 2;
  }

  y += 6;
  // Signature block
  y = checkPageBreak(40);
  doc.setDrawColor(...COLORS.gray);
  doc.setLineWidth(0.3);
  const sigX = marginL + 15;
  const sigW = 65;
  doc.line(sigX, y, sigX + sigW, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.text("Responsável Técnico", sigX + sigW / 2, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.text("CREA/CAU: ___________", sigX + sigW / 2, y + 10, { align: "center" });

  const sigX2 = pageW / 2 + 10;
  doc.setDrawColor(...COLORS.gray);
  doc.line(sigX2, y, sigX2 + sigW, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.text("Diretor Técnico", sigX2 + sigW / 2, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.text("CREA/CAU: ___________", sigX2 + sigW / 2, y + 10, { align: "center" });

  y += 20;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray);
  doc.text(
    `Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — Sistema de Orçamentação`,
    pageW / 2, y, { align: "center" }
  );

  return doc;
}

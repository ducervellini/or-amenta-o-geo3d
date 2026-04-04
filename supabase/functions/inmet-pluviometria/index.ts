const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PluviometriaRequest {
  latitude: number;
  longitude: number;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;    // YYYY-MM-DD
  anos_historico?: number; // How many past years to analyze (default 5)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, data_inicio, data_fim, anos_historico = 5 } = await req.json() as PluviometriaRequest;

    if (!latitude || !longitude || !data_inicio || !data_fim) {
      return new Response(
        JSON.stringify({ success: false, error: 'latitude, longitude, data_inicio e data_fim são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find nearest INMET station
    const stationsRes = await fetch('https://apitempo.inmet.gov.br/estacoes/T');
    if (!stationsRes.ok) {
      throw new Error(`Erro ao buscar estações INMET: ${stationsRes.status}`);
    }
    const stations = await stationsRes.json();

    let nearestStation: any = null;
    let minDist = Infinity;

    for (const st of stations) {
      const stLat = parseFloat(st.VL_LATITUDE);
      const stLng = parseFloat(st.VL_LONGITUDE);
      if (isNaN(stLat) || isNaN(stLng)) continue;

      const dist = haversine(latitude, longitude, stLat, stLng);
      if (dist < minDist) {
        minDist = dist;
        nearestStation = st;
      }
    }

    if (!nearestStation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma estação INMET encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stationCode = nearestStation.CD_ESTACAO;

    // 2. Determine the project months (month/day range)
    const projInicio = new Date(data_inicio);
    const projFim = new Date(data_fim);
    const mesInicio = projInicio.getMonth(); // 0-based
    const mesFim = projFim.getMonth();
    const currentYear = new Date().getFullYear();

    // 3. Query historical data for each of the past N years
    // For each year, query the same month range as the project
    const yearsToQuery = Math.min(anos_historico, 10);
    const allYearlyData: any[][] = [];
    const anosConsultados: number[] = [];

    for (let i = 1; i <= yearsToQuery; i++) {
      const year = currentYear - i;
      // Build start/end dates for this historical year
      const histInicio = `${year}-${String(projInicio.getMonth() + 1).padStart(2, '0')}-${String(projInicio.getDate()).padStart(2, '0')}`;
      const histFim = `${year + (projFim.getFullYear() - projInicio.getFullYear())}-${String(projFim.getMonth() + 1).padStart(2, '0')}-${String(projFim.getDate()).padStart(2, '0')}`;

      try {
        const dataRes = await fetch(
          `https://apitempo.inmet.gov.br/estacao/diaria/${histInicio}/${histFim}/${stationCode}`
        );
        if (dataRes.ok) {
          const dados = await dataRes.json();
          if (Array.isArray(dados) && dados.length > 0) {
            allYearlyData.push(dados);
            anosConsultados.push(year);
          }
        }
      } catch (e) {
        console.error(`Erro ao buscar ano ${year}:`, e);
      }
    }

    if (allYearlyData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          estacao: {
            codigo: stationCode,
            nome: nearestStation.DC_NOME,
            municipio: nearestStation.SG_ENTIDADE || nearestStation.DC_NOME,
            uf: nearestStation.SG_ESTADO,
            latitude: parseFloat(nearestStation.VL_LATITUDE),
            longitude: parseFloat(nearestStation.VL_LONGITUDE),
            distancia_km: Math.round(minDist * 10) / 10,
          },
          periodo: { inicio: data_inicio, fim: data_fim },
          anos_analisados: [],
          resumo: {
            precipitacao_total_mm: 0,
            dias_com_chuva: 0,
            dias_registrados: 0,
            media_dias_chuva_mes: 0,
            media_precipitacao_diaria_mm: 0,
          },
          mensal: [],
          historico_anual: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Process: group by "project month" (month index relative to project start)
    // We normalize each historical year's data to project-relative months
    const projectMonths = getProjectMonths(projInicio, projFim);
    
    // For each project month, collect data across all years
    const monthlyAggregated: Record<string, { 
      precipTotal: number[]; 
      diasChuva: number[]; 
      diasRegistro: number[];
      label: string;
    }> = {};

    for (const pm of projectMonths) {
      monthlyAggregated[pm.key] = {
        precipTotal: [],
        diasChuva: [],
        diasRegistro: [],
        label: pm.label,
      };
    }

    // Per-year breakdown
    const historicoAnual: { ano: number; mensal: any[] }[] = [];

    for (let yi = 0; yi < allYearlyData.length; yi++) {
      const yearData = allYearlyData[yi];
      const ano = anosConsultados[yi];
      const yearMonthMap: Record<string, { precip: number; diasChuva: number; diasReg: number }> = {};

      for (const d of yearData) {
        const precip = parseFloat(d.CHUVA) || 0;
        const dt = d.DT_MEDICAO;
        if (!dt) continue;
        
        const month = parseInt(dt.substring(5, 7)); // 1-based
        // Find matching project month
        const pmKey = projectMonths.find(pm => pm.month === month)?.key;
        if (!pmKey) continue;

        if (!yearMonthMap[pmKey]) {
          yearMonthMap[pmKey] = { precip: 0, diasChuva: 0, diasReg: 0 };
        }
        yearMonthMap[pmKey].precip += precip;
        if (precip > 0.2) yearMonthMap[pmKey].diasChuva += 1;
        yearMonthMap[pmKey].diasReg += 1;
      }

      const anoMensal = [];
      for (const pm of projectMonths) {
        const ym = yearMonthMap[pm.key];
        if (ym) {
          monthlyAggregated[pm.key].precipTotal.push(ym.precip);
          monthlyAggregated[pm.key].diasChuva.push(ym.diasChuva);
          monthlyAggregated[pm.key].diasRegistro.push(ym.diasReg);
          anoMensal.push({
            mes: pm.label,
            mes_numero: pm.month,
            precipitacao_total: Math.round(ym.precip * 10) / 10,
            dias_chuva: ym.diasChuva,
            dias_registro: ym.diasReg,
          });
        }
      }
      historicoAnual.push({ ano, mensal: anoMensal });
    }

    // 5. Calculate averages per project month
    const mensal = projectMonths.map(pm => {
      const agg = monthlyAggregated[pm.key];
      const avgPrecip = agg.precipTotal.length > 0
        ? agg.precipTotal.reduce((a, b) => a + b, 0) / agg.precipTotal.length : 0;
      const avgDiasChuva = agg.diasChuva.length > 0
        ? agg.diasChuva.reduce((a, b) => a + b, 0) / agg.diasChuva.length : 0;
      const avgDiasReg = agg.diasRegistro.length > 0
        ? agg.diasRegistro.reduce((a, b) => a + b, 0) / agg.diasRegistro.length : 0;
      const minPrecip = agg.precipTotal.length > 0 ? Math.min(...agg.precipTotal) : 0;
      const maxPrecip = agg.precipTotal.length > 0 ? Math.max(...agg.precipTotal) : 0;
      
      return {
        mes: pm.label,
        mes_numero: pm.month,
        precipitacao_media: Math.round(avgPrecip * 10) / 10,
        precipitacao_min: Math.round(minPrecip * 10) / 10,
        precipitacao_max: Math.round(maxPrecip * 10) / 10,
        dias_chuva_media: Math.round(avgDiasChuva * 10) / 10,
        dias_registro_media: Math.round(avgDiasReg * 10) / 10,
        anos_dados: agg.precipTotal.length,
      };
    });

    // 6. Overall summary
    const totalPrecipMedia = mensal.reduce((s, m) => s + m.precipitacao_media, 0);
    const totalDiasChuvaMedia = mensal.reduce((s, m) => s + m.dias_chuva_media, 0);
    const totalDiasRegMedia = mensal.reduce((s, m) => s + m.dias_registro_media, 0);
    const mediaMensalChuva = mensal.length > 0 ? totalDiasChuvaMedia / mensal.length : 0;

    const result = {
      success: true,
      estacao: {
        codigo: stationCode,
        nome: nearestStation.DC_NOME,
        municipio: nearestStation.SG_ENTIDADE || nearestStation.DC_NOME,
        uf: nearestStation.SG_ESTADO,
        latitude: parseFloat(nearestStation.VL_LATITUDE),
        longitude: parseFloat(nearestStation.VL_LONGITUDE),
        distancia_km: Math.round(minDist * 10) / 10,
      },
      periodo: { inicio: data_inicio, fim: data_fim },
      anos_analisados: anosConsultados.sort(),
      resumo: {
        precipitacao_total_mm: Math.round(totalPrecipMedia * 10) / 10,
        dias_com_chuva: Math.round(totalDiasChuvaMedia),
        dias_registrados: Math.round(totalDiasRegMedia),
        media_dias_chuva_mes: Math.round(mediaMensalChuva * 10) / 10,
        media_precipitacao_diaria_mm: totalDiasRegMedia > 0
          ? Math.round((totalPrecipMedia / totalDiasRegMedia) * 10) / 10 : 0,
      },
      mensal,
      historico_anual: historicoAnual.sort((a, b) => a.ano - b.ano),
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getProjectMonths(inicio: Date, fim: Date): { key: string; month: number; label: string }[] {
  const months: { key: string; month: number; label: string }[] = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  let current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const end = new Date(fim.getFullYear(), fim.getMonth(), 1);
  
  while (current <= end) {
    const m = current.getMonth(); // 0-based
    months.push({
      key: `m${m + 1}`,
      month: m + 1,
      label: monthNames[m],
    });
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

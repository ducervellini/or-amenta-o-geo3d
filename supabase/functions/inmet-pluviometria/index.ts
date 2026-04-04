const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PluviometriaRequest {
  latitude: number;
  longitude: number;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;    // YYYY-MM-DD
  anos_historico?: number;
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

    const projInicio = new Date(data_inicio);
    const projFim = new Date(data_fim);
    const currentYear = new Date().getFullYear();
    const yearsToQuery = Math.min(anos_historico, 10);

    // Get project months
    const projectMonths = getProjectMonths(projInicio, projFim);

    // Aggregate: for each project month, collect precipitation data across years
    const monthlyAggregated: Record<string, {
      precipTotal: number[];
      diasChuva: number[];
      diasRegistro: number[];
      label: string;
    }> = {};

    for (const pm of projectMonths) {
      monthlyAggregated[pm.key] = { precipTotal: [], diasChuva: [], diasRegistro: [], label: pm.label };
    }

    const anosConsultados: number[] = [];
    const historicoAnual: { ano: number; mensal: any[] }[] = [];

    // Query NASA POWER API for each historical year
    for (let i = 1; i <= yearsToQuery; i++) {
      const year = currentYear - i;
      const yearDiff = projFim.getFullYear() - projInicio.getFullYear();
      const histStart = `${year}${String(projInicio.getMonth() + 1).padStart(2, '0')}${String(projInicio.getDate()).padStart(2, '0')}`;
      const histEnd = `${year + yearDiff}${String(projFim.getMonth() + 1).padStart(2, '0')}${String(projFim.getDate()).padStart(2, '0')}`;

      try {
        const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG&longitude=${longitude}&latitude=${latitude}&start=${histStart}&end=${histEnd}&format=JSON`;
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`NASA POWER error for ${year}: ${res.status}`);
          continue;
        }
        const json = await res.json();
        const dailyData = json?.properties?.parameter?.PRECTOTCORR;
        if (!dailyData || typeof dailyData !== 'object') continue;

        // Group by month
        const yearMonthMap: Record<string, { precip: number; diasChuva: number; diasReg: number }> = {};

        for (const [dateStr, value] of Object.entries(dailyData)) {
          const precip = value as number;
          if (precip < 0) continue; // NASA uses -999 for missing data
          const month = parseInt(dateStr.substring(4, 6)); // YYYYMMDD -> MM

          const pmKey = projectMonths.find(pm => pm.month === month)?.key;
          if (!pmKey) continue;

          if (!yearMonthMap[pmKey]) {
            yearMonthMap[pmKey] = { precip: 0, diasChuva: 0, diasReg: 0 };
          }
          yearMonthMap[pmKey].precip += precip;
          if (precip > 0.2) yearMonthMap[pmKey].diasChuva += 1;
          yearMonthMap[pmKey].diasReg += 1;
        }

        // Only count this year if we got meaningful data
        const hasData = Object.keys(yearMonthMap).length > 0;
        if (!hasData) continue;

        anosConsultados.push(year);

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
        historicoAnual.push({ ano: year, mensal: anoMensal });
      } catch (e) {
        console.error(`Error fetching year ${year}:`, e);
      }
    }

    // Calculate averages per project month
    const mensal = projectMonths.map(pm => {
      const agg = monthlyAggregated[pm.key];
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const avgPrecip = avg(agg.precipTotal);
      const avgDiasChuva = avg(agg.diasChuva);
      const avgDiasReg = avg(agg.diasRegistro);
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

    // Overall summary
    const totalPrecipMedia = mensal.reduce((s, m) => s + m.precipitacao_media, 0);
    const totalDiasChuvaMedia = mensal.reduce((s, m) => s + m.dias_chuva_media, 0);
    const totalDiasRegMedia = mensal.reduce((s, m) => s + m.dias_registro_media, 0);
    const mediaMensalChuva = mensal.length > 0 ? totalDiasChuvaMedia / mensal.length : 0;

    const result = {
      success: true,
      estacao: {
        codigo: 'NASA-POWER',
        nome: `NASA POWER (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
        municipio: 'Dados satelitais',
        uf: '—',
        latitude,
        longitude,
        distancia_km: 0,
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
    const m = current.getMonth();
    months.push({ key: `m${m + 1}`, month: m + 1, label: monthNames[m] });
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

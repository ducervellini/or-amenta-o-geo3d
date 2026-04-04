const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PluviometriaRequest {
  latitude: number;
  longitude: number;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;    // YYYY-MM-DD
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, data_inicio, data_fim } = await req.json() as PluviometriaRequest;

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

    // Find nearest station by haversine distance
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

    // 2. Fetch historical data from INMET
    // INMET API format: /estacao/{inicio}/{fim}/{codigo}
    const inicio = data_inicio.replace(/-/g, '-');
    const fim = data_fim.replace(/-/g, '-');
    
    const dataRes = await fetch(
      `https://apitempo.inmet.gov.br/estacao/diaria/${inicio}/${fim}/${stationCode}`
    );

    let dadosDiarios: any[] = [];
    if (dataRes.ok) {
      dadosDiarios = await dataRes.json();
    }

    // 3. Process monthly rainfall data
    const mensalMap: Record<string, { precipitacao_total: number; dias_chuva: number; dias_registro: number }> = {};

    for (const d of dadosDiarios) {
      const precip = parseFloat(d.CHUVA) || 0;
      const dt = d.DT_MEDICAO; // YYYY-MM-DD
      if (!dt) continue;
      const mesAno = dt.substring(0, 7); // YYYY-MM

      if (!mensalMap[mesAno]) {
        mensalMap[mesAno] = { precipitacao_total: 0, dias_chuva: 0, dias_registro: 0 };
      }
      mensalMap[mesAno].precipitacao_total += precip;
      if (precip > 0.2) mensalMap[mesAno].dias_chuva += 1;
      mensalMap[mesAno].dias_registro += 1;
    }

    const mensal = Object.entries(mensalMap)
      .map(([mes, dados]) => ({
        mes,
        ...dados,
        precipitacao_media_diaria: dados.dias_registro > 0 ? dados.precipitacao_total / dados.dias_registro : 0,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // 4. Calculate summary statistics
    const totalPrecip = mensal.reduce((s, m) => s + m.precipitacao_total, 0);
    const totalDiasChuva = mensal.reduce((s, m) => s + m.dias_chuva, 0);
    const totalDiasRegistro = mensal.reduce((s, m) => s + m.dias_registro, 0);
    const mediaMensalChuva = mensal.length > 0 ? totalDiasChuva / mensal.length : 0;

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
      resumo: {
        precipitacao_total_mm: Math.round(totalPrecip * 10) / 10,
        dias_com_chuva: totalDiasChuva,
        dias_registrados: totalDiasRegistro,
        media_dias_chuva_mes: Math.round(mediaMensalChuva * 10) / 10,
        media_precipitacao_diaria_mm: totalDiasRegistro > 0 ? Math.round((totalPrecip / totalDiasRegistro) * 10) / 10 : 0,
      },
      mensal,
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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

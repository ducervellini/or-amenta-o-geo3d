const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { origem_municipio, origem_estado, destino_municipio, destino_estado, destino_lat, destino_lng } = await req.json();

    if (!origem_municipio || !origem_estado) {
      return new Response(
        JSON.stringify({ success: false, error: 'Município e estado de origem são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === Carrega fator regional (UF do destino, fallback origem) — Fase 1 BDI/CCU ===
    const ufRegional = (destino_estado || origem_estado || '').toUpperCase().slice(0, 2);
    let fatorRotaRegional = 1.30;
    let velocidadeMediaRegional = 80;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && serviceKey && ufRegional) {
        const rRes = await fetch(
          `${supabaseUrl}/rest/v1/parametros_logistica_regional?uf=eq.${ufRegional}&ativo=eq.true&deleted_at=is.null&select=fator_rota_rodovia_federal,velocidade_media_kmh&limit=1`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        );
        if (rRes.ok) {
          const arr = await rRes.json();
          if (Array.isArray(arr) && arr[0]) {
            fatorRotaRegional = Number(arr[0].fator_rota_rodovia_federal) || 1.30;
            velocidadeMediaRegional = Number(arr[0].velocidade_media_kmh) || 80;
          }
        }
      }
    } catch (e) {
      console.warn('Falha ao carregar parametros_logistica_regional, usando defaults:', e);
    }

    if (!destino_municipio && !destino_lat) {
      return new Response(
        JSON.stringify({ success: false, error: 'Destino (município ou coordenadas) é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Geocode origin
    const origemQuery = `${origem_municipio}, ${origem_estado}, Brasil`;
    const origemGeoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origemQuery)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'MobilizacaoApp/1.0' } }
    );
    const origemGeoData = await origemGeoRes.json();

    if (!origemGeoData?.[0]) {
      return new Response(
        JSON.stringify({ success: false, error: `Não foi possível localizar: ${origemQuery}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const origemLat = parseFloat(origemGeoData[0].lat);
    const origemLng = parseFloat(origemGeoData[0].lon);

    // 2. Geocode destination (if needed)
    let destLat = destino_lat;
    let destLng = destino_lng;

    if (!destLat || !destLng) {
      const destQuery = `${destino_municipio}, ${destino_estado}, Brasil`;
      const destGeoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destQuery)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'MobilizacaoApp/1.0' } }
      );
      const destGeoData = await destGeoRes.json();

      if (!destGeoData?.[0]) {
        return new Response(
          JSON.stringify({ success: false, error: `Não foi possível localizar destino: ${destQuery}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      destLat = parseFloat(destGeoData[0].lat);
      destLng = parseFloat(destGeoData[0].lon);
    }

    // 3. Calculate route via OSRM
    let distanciaKm: number;
    let duracaoHoras: number;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destLng},${destLat}?overview=false`;
      const osrmRes = await fetch(osrmUrl);
      const osrmText = await osrmRes.text();
      
      let osrmData;
      try {
        osrmData = JSON.parse(osrmText);
      } catch {
        console.error('OSRM returned non-JSON:', osrmText.substring(0, 200));
        // Fallback: calculate straight-line distance using Haversine
        osrmData = null;
      }

      if (osrmData?.code === 'Ok' && osrmData.routes?.[0]) {
        const route = osrmData.routes[0];
        distanciaKm = Math.round(route.distance / 1000);
        duracaoHoras = Math.round(route.duration / 3600 * 10) / 10;
      } else {
        // Fallback: Haversine com fator regional
        const R = 6371;
        const dLat = (destLat - origemLat) * Math.PI / 180;
        const dLon = (destLng - origemLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(origemLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const straightLine = R * c;
        distanciaKm = Math.round(straightLine * fatorRotaRegional);
        duracaoHoras = Math.round(distanciaKm / velocidadeMediaRegional * 10) / 10;
        console.log(`Fallback Haversine (${ufRegional}, fator ${fatorRotaRegional}): ${straightLine.toFixed(0)}km straight → ${distanciaKm}km estimated`);
      }
    } catch (routeErr) {
      console.error('Route calculation error:', routeErr);
      // Haversine fallback regional
      const R = 6371;
      const dLat = (destLat - origemLat) * Math.PI / 180;
      const dLon = (destLng - origemLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(origemLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const straightLine = R * c;
      distanciaKm = Math.round(straightLine * fatorRotaRegional);
      duracaoHoras = Math.round(distanciaKm / velocidadeMediaRegional * 10) / 10;
    }

    // 4. Generate rotasbrasil URL for toll lookup
    const rotasBrasilUrl = `https://rotasbrasil.com.br/mapa/?de=${encodeURIComponent(origem_municipio + ', ' + origem_estado)}&ate=${encodeURIComponent((destino_municipio || 'Projeto') + ', ' + (destino_estado || ''))}`;

    return new Response(
      JSON.stringify({
        success: true,
        distancia_km: distanciaKm,
        duracao_horas: duracaoHoras,
        origem: {
          municipio: origem_municipio,
          estado: origem_estado,
          lat: origemLat,
          lng: origemLng,
        },
        destino: {
          lat: destLat,
          lng: destLng,
        },
        rotas_brasil_url: rotasBrasilUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

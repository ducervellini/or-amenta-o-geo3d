import { corsHeaders } from '@supabase/supabase-js/cors'

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
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destLng},${destLat}?overview=false`;
    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes?.[0]) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível calcular a rota' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = osrmData.routes[0];
    const distanciaKm = Math.round(route.distance / 1000);
    const duracaoHoras = Math.round(route.duration / 3600 * 10) / 10;

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

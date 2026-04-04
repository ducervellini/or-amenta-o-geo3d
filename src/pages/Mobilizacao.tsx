import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  MapPin, Plus, Trash2, Save, Loader2, Cloud, Sun,
  Truck, Home, Utensils, Fuel, CreditCard, Plane,
  Users, Calculator, ChevronDown, ChevronUp, Info, Upload,
  FileUp, Navigation, CloudRain, BarChart3, Calendar, Route, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useSupabaseQuery, useSupabaseInsert, useSupabaseUpdate, useSupabaseDelete,
} from "@/hooks/useSupabaseCrud";
import {
  calcularMobilizacao,
  calcularDiasProdutivos,
  CATEGORIAS_CUSTO,
  FREQUENCIAS,
  type CustoItem,
  type EquipeItem,
  type MobilizacaoParams,
} from "@/lib/mobilizacao-calculo";
import {
  parseGeoFile, getGeoJSONCenter, getGeoJSONBounds,
  findMunicipiosFromGeoJSON,
} from "@/lib/geo-utils";
import { supabase } from "@/integrations/supabase/client";
import type { FeatureCollection } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ICON_MAP: Record<string, React.ElementType> = {
  hospedagem: Home,
  alimentacao: Utensils,
  combustivel: Fuel,
  veiculo: Truck,
  pedagio: CreditCard,
  viagem_avulsa: Plane,
};

// ── Types ──
interface MunicipioRota {
  nome: string;
  uf: string;
  distancia_km: number;
}

interface PluviometriaResult {
  estacao: {
    codigo: string;
    nome: string;
    municipio: string;
    uf: string;
    distancia_km: number;
  };
  periodo: { inicio: string; fim: string };
  anos_analisados: number[];
  resumo: {
    precipitacao_total_mm: number;
    dias_com_chuva: number;
    dias_registrados: number;
    media_dias_chuva_mes: number;
    media_precipitacao_diaria_mm: number;
  };
  mensal: {
    mes: string;
    mes_numero: number;
    precipitacao_media: number;
    precipitacao_min: number;
    precipitacao_max: number;
    dias_chuva_media: number;
    dias_registro_media: number;
    anos_dados: number;
  }[];
  historico_anual: {
    ano: number;
    mensal: {
      mes: string;
      mes_numero: number;
      precipitacao_total: number;
      dias_chuva: number;
      dias_registro: number;
    }[];
  }[];
}

// ── Plain Leaflet Map Component ──
function LeafletMap({
  projectLat, projectLng, baseLat, baseLng, municipio, baseEndereco, geoJsonData,
}: {
  projectLat: number; projectLng: number;
  baseLat: number; baseLng: number;
  municipio: string; baseEndereco: string;
  geoJsonData?: FeatureCollection | null;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current).setView([projectLat, projectLng], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => mapRef.current?.removeLayer(m));
    markersRef.current = [];

    if (projectLat && projectLng) {
      const m = L.marker([projectLat, projectLng])
        .addTo(mapRef.current)
        .bindPopup(`Projeto: ${municipio || "Local do projeto"}`);
      markersRef.current.push(m);
    }
    if (baseLat && baseLng && (baseLat !== projectLat || baseLng !== projectLng)) {
      const baseIcon = L.divIcon({
        className: "",
        html: `<div style="background:hsl(var(--primary));width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const m = L.marker([baseLat, baseLng], { icon: baseIcon })
        .addTo(mapRef.current)
        .bindPopup(`Base: ${baseEndereco || "Ponto inicial"}`);
      markersRef.current.push(m);

      // Draw line between base and project
      const line = L.polyline(
        [[baseLat, baseLng], [projectLat, projectLng]],
        { color: "hsl(var(--primary))", weight: 2, dashArray: "6 4", opacity: 0.6 }
      ).addTo(mapRef.current);
      markersRef.current.push(line);
    }

    // Fit to GeoJSON if present, otherwise center on project
    if (geoJsonData && geoJsonData.features.length > 0) {
      // handled in geoJsonData effect
      mapRef.current.setView([projectLat, projectLng], 8);
    } else {
      mapRef.current.setView([projectLat, projectLng], 8);
    }
  }, [projectLat, projectLng, baseLat, baseLng, municipio, baseEndereco]);

  // GeoJSON layer effect
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old layer
    if (geoLayerRef.current) {
      mapRef.current.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    if (geoJsonData && geoJsonData.features.length > 0) {
      geoLayerRef.current = L.geoJSON(geoJsonData as any, {
        style: {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.8,
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
        },
        pointToLayer: (_, latlng) => L.circleMarker(latlng, {
          radius: 6,
          fillColor: "#3b82f6",
          color: "#1e40af",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        }),
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.name || feature.properties?.Name || feature.properties?.nome || "";
          if (name) layer.bindPopup(name);
        },
      }).addTo(mapRef.current);

      // Fit map to GeoJSON bounds
      const bounds = geoLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [geoJsonData]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ── Collapsible Section ──
function Section({
  title, icon: Icon, children, defaultOpen = true, badge,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {title}
            {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
          </CardTitle>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

export default function Mobilizacao() {
  // ── State ──
  const [nome, setNome] = useState("Nova Mobilização");
  const [modoLocalizacao, setModoLocalizacao] = useState<"manual" | "arquivo">("manual");
  const [municipio, setMunicipio] = useState("");
  const [estado, setEstado] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geocodificando, setGeocodificando] = useState(false);
  const [arquivoGeo, setArquivoGeo] = useState("");
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [geoProgress, setGeoProgress] = useState("");
  const [baseLat, setBaseLat] = useState<number | null>(null);
  const [baseLng, setBaseLng] = useState<number | null>(null);
  const [diasUteisMes, setDiasUteisMes] = useState(24);
  const [diasTrabalho, setDiasTrabalho] = useState(24);
  const [jornadaDiaria, setJornadaDiaria] = useState(8);
  const [diasChuvaMes, setDiasChuvaMes] = useState(5);
  const [fatorImprod, setFatorImprod] = useState(0.15);
  const [distanciaBase, setDistanciaBase] = useState(50);
  const [distanciaMedia, setDistanciaMedia] = useState(30);

  // Veículo / Custo por km
  const [consumoMedioKmL, setConsumoMedioKmL] = useState(8); // km/L
  const [precoCombustivel, setPrecoCombustivel] = useState(6.5); // R$/L
  const [kmMedioDiario, setKmMedioDiario] = useState(80); // km/dia

  const custoKmRodado = useMemo(() => {
    if (consumoMedioKmL <= 0) return 0;
    return precoCombustivel / consumoMedioKmL;
  }, [precoCombustivel, consumoMedioKmL]);

  const custoCombustivelDiario = useMemo(() => {
    return custoKmRodado * kmMedioDiario;
  }, [custoKmRodado, kmMedioDiario]);

  // custoCombustivelMensal calculated after diasProdutivos is available

  // Datas do projeto (data início = hoje)
  const [dataInicio, setDataInicio] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [duracaoMeses, setDuracaoMeses] = useState(3);
  const dataFim = useMemo(() => {
    const d = new Date(dataInicio);
    d.setMonth(d.getMonth() + duracaoMeses);
    return d.toISOString().split("T")[0];
  }, [dataInicio, duracaoMeses]);

  // Auto-geocode município/estado
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!municipio || !estado || modoLocalizacao !== "manual") return;
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(async () => {
      setGeocodificando(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(municipio + ", " + estado + ", Brasil")}&format=json&limit=1`,
          { headers: { "User-Agent": "MobilizacaoApp/1.0" } }
        );
        const data = await res.json();
        if (data?.[0]) {
          setLat(parseFloat(data[0].lat));
          setLng(parseFloat(data[0].lon));
        }
      } catch (e) {
        console.error("Geocode error:", e);
      } finally {
        setGeocodificando(false);
      }
    }, 1000);
    return () => { if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current); };
  }, [municipio, estado, modoLocalizacao]);

  // Municípios na rota
  const [municipiosRota, setMunicipiosRota] = useState<MunicipioRota[]>([]);
  const [novoMunicipioNome, setNovoMunicipioNome] = useState("");
  const [novoMunicipioUF, setNovoMunicipioUF] = useState("");
  const [novoMunicipioDist, setNovoMunicipioDist] = useState(0);

  // Pluviometria
  const [pluviometria, setPluviometria] = useState<PluviometriaResult | null>(null);
  const [loadingPluv, setLoadingPluv] = useState(false);

  // Hospedagem
  const [tipoHospedagem, setTipoHospedagem] = useState<"hotel" | "alojamento_mobiliado" | "alojamento_mobiliar">("hotel");
  // Hotel
  interface QuartoHotel { _key: number; tipo: "single" | "duplo" | "triplo"; diaria: number; quantidade: number }
  const [quartosHotel, setQuartosHotel] = useState<QuartoHotel[]>([
    { _key: 1, tipo: "single", diaria: 180, quantidade: 2 },
  ]);
  let quartoKeyRef = useRef(2);
  const addQuarto = () => {
    setQuartosHotel(prev => [...prev, { _key: quartoKeyRef.current++, tipo: "single", diaria: 0, quantidade: 1 }]);
  };
  const removeQuarto = (key: number) => setQuartosHotel(prev => prev.filter(q => q._key !== key));
  const updateQuarto = (key: number, field: string, value: any) => {
    setQuartosHotel(prev => prev.map(q => q._key === key ? { ...q, [field]: value } : q));
  };
  // Duração hospedagem (pré-configurada com duração do projeto)
  const [duracaoHospedagemMeses, setDuracaoHospedagemMeses] = useState(duracaoMeses);
  // Sync default when duracaoMeses changes (only if user hasn't customized)
  const duracaoHospedagemSynced = useRef(true);
  useEffect(() => {
    if (duracaoHospedagemSynced.current) setDuracaoHospedagemMeses(duracaoMeses);
  }, [duracaoMeses]);
  const handleDuracaoHospedagem = (v: number) => {
    duracaoHospedagemSynced.current = false;
    setDuracaoHospedagemMeses(v);
  };

  // Alojamento mobiliado
  const [alojamentoMobiliadoValor, setAlojamentoMobiliadoValor] = useState(3000);
  const [alojamentoMobiliadoQtd, setAlojamentoMobiliadoQtd] = useState(1);
  // Alojamento a mobiliar
  const [alojamentoMobiliarAluguel, setAlojamentoMobiliarAluguel] = useState(2000);
  const [alojamentoMobiliarQtd, setAlojamentoMobiliarQtd] = useState(1);
  const [alojamentoMobiliarMobilia, setAlojamentoMobiliarMobilia] = useState(5000);
  const [alojamentoMobiliarRevenda, setAlojamentoMobiliarRevenda] = useState(50);

  const custoHospedagemMensal = useMemo(() => {
    if (tipoHospedagem === "hotel") {
      return quartosHotel.reduce((acc, q) => acc + q.diaria * q.quantidade * diasTrabalho, 0);
    }
    if (tipoHospedagem === "alojamento_mobiliado") {
      return alojamentoMobiliadoValor * alojamentoMobiliadoQtd;
    }
    const aluguelTotal = alojamentoMobiliarAluguel * alojamentoMobiliarQtd;
    const mobiliaTotal = alojamentoMobiliarMobilia * alojamentoMobiliarQtd;
    const revendaTotal = mobiliaTotal * (alojamentoMobiliarRevenda / 100);
    const custoLiquidoMobilia = mobiliaTotal - revendaTotal;
    const amortizacaoMensal = duracaoHospedagemMeses > 0 ? custoLiquidoMobilia / duracaoHospedagemMeses : custoLiquidoMobilia;
    return aluguelTotal + amortizacaoMensal;
  }, [tipoHospedagem, quartosHotel, diasTrabalho, alojamentoMobiliadoValor, alojamentoMobiliadoQtd,
    alojamentoMobiliarAluguel, alojamentoMobiliarQtd, alojamentoMobiliarMobilia, alojamentoMobiliarRevenda, duracaoHospedagemMeses]);

  const custoHospedagemTotal = useMemo(() => custoHospedagemMensal * duracaoHospedagemMeses, [custoHospedagemMensal, duracaoHospedagemMeses]);

  // Veículos cadastrados
  const { data: veiculosCadastrados } = useSupabaseQuery("veiculos");

  // Custos (sem hospedagem, que agora é separada)
  const [custos, setCustos] = useState<(CustoItem & { _key: number; veiculo_id?: string; km_dia?: number; preco_combustivel?: number })[]>([]);
  let custoKeyRef = 4;

  // Equipes
  const [equipes, setEquipes] = useState<(EquipeItem & { _key: number })[]>([
    { _key: 1, nome: "Equipe Campo", quantidade_pessoas: 4, custo_deslocamento: 0, custo_hospedagem: 150, custo_alimentacao: 0 },
  ]);
  let equipeKeyRef = 2;

  // ── Mobilização / Desmobilização ──
  const [mobDesmobItens, setMobDesmobItens] = useState<{
    _key: number;
    municipio_saida: string;
    estado_saida: string;
    veiculo_id: string;
    distancia_km: number;
    km_max_dia: number;
    hospedagem_pernoite: number;
    pedagios_ida: number;
    quantidade_pessoas: number;
    quantidade_veiculos: number;
  }[]>([]);
  const mobDesmobKeyRef = useRef(1);

  const addMobDesmob = () => {
    setMobDesmobItens((prev) => [
      ...prev,
      {
        _key: mobDesmobKeyRef.current++,
        municipio_saida: "",
        estado_saida: "",
        veiculo_id: "",
        distancia_km: 0,
        km_max_dia: 500,
        hospedagem_pernoite: 150,
        pedagios_ida: 0,
        quantidade_pessoas: 1,
        quantidade_veiculos: 1,
      },
    ]);
  };

  const updateMobDesmob = (key: number, field: string, value: any) => {
    setMobDesmobItens((prev) =>
      prev.map((item) => (item._key === key ? { ...item, [field]: value } : item))
    );
  };

  const removeMobDesmob = (key: number) => {
    setMobDesmobItens((prev) => prev.filter((item) => item._key !== key));
  };

  const calcularMobDesmobItem = useCallback((item: typeof mobDesmobItens[0]) => {
    const veic = (veiculosCadastrados as any[])?.find((v: any) => v.id === item.veiculo_id);
    const mediaKmL = veic?.media_km_l || 0;
    const precoComb = veic?.combustivel_preco_litro || 0;
    const custoKm = mediaKmL > 0 ? precoComb / mediaKmL : 0;
    const distancia = item.distancia_km;
    const diasViagem = item.km_max_dia > 0 ? Math.ceil(distancia / item.km_max_dia) : 1;
    const pernoites = Math.max(0, diasViagem - 1);
    const custoCombustivelIda = custoKm * distancia * item.quantidade_veiculos;
    const custoPernoiteIda = pernoites * item.hospedagem_pernoite * item.quantidade_pessoas;
    const custoIda = custoCombustivelIda + custoPernoiteIda + item.pedagios_ida;
    const custoTotal = custoIda * 2;
    return { veic, mediaKmL, custoKm, diasViagem, pernoites, custoCombustivelIda, custoPernoiteIda, custoIda, custoTotal };
  }, [veiculosCadastrados]);

  const custoMobDesmobTotal = useMemo(() => {
    return mobDesmobItens.reduce((acc, item) => acc + calcularMobDesmobItem(item).custoTotal, 0);
  }, [mobDesmobItens, calcularMobDesmobItem]);

  const params: MobilizacaoParams = {
    dias_trabalho: diasTrabalho,
    jornada_diaria: jornadaDiaria,
    dias_chuva_mes: diasChuvaMes,
    fator_improdutividade: fatorImprod,
    distancia_base_projeto: distanciaBase,
    distancia_media_diaria: distanciaMedia,
  };

  const resultado = useMemo(
    () => calcularMobilizacao(params, custos, equipes),
    [diasTrabalho, jornadaDiaria, diasChuvaMes, fatorImprod, distanciaBase, distanciaMedia, custos, equipes, duracaoMeses]
  );

  const { diasProdutivos: diasProdutivosMes, diasImprodutivos: diasImprodutivosMes } = calcularDiasProdutivos(params);
  const diasProdutivos = diasProdutivosMes * duracaoMeses;
  const diasImprodutivos = diasImprodutivosMes * duracaoMeses;
  const custoCombustivelMensal = custoCombustivelDiario * diasProdutivosMes;
  const custoCombustivelTotal = custoCombustivelMensal * duracaoMeses;

  // ── Pluviometria INMET ──
  const buscarPluviometria = async () => {
    if (!lat || !lng) {
      toast.error("Informe o município/estado ou importe um arquivo geográfico");
      return;
    }
    setLoadingPluv(true);
    try {
      const { data, error } = await supabase.functions.invoke("inmet-pluviometria", {
        body: {
          latitude: lat,
          longitude: lng,
          data_inicio: dataInicio,
          data_fim: dataFim,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");
      setPluviometria(data);
      // Auto-fill dias de chuva/mês
      if (data.resumo?.media_dias_chuva_mes) {
        setDiasChuvaMes(Math.round(data.resumo.media_dias_chuva_mes));
        toast.success(`Dias de chuva/mês atualizado: ${Math.round(data.resumo.media_dias_chuva_mes)} dias`);
      }
    } catch (err: any) {
      console.error("Erro pluviometria:", err);
      toast.error("Erro ao consultar dados pluviométricos: " + (err.message || "tente novamente"));
    } finally {
      setLoadingPluv(false);
    }
  };

  // ── Município handlers ──
  const addMunicipioRota = () => {
    if (!novoMunicipioNome.trim()) return;
    setMunicipiosRota((prev) => [
      ...prev,
      { nome: novoMunicipioNome, uf: novoMunicipioUF, distancia_km: novoMunicipioDist },
    ]);
    setNovoMunicipioNome("");
    setNovoMunicipioUF("");
    setNovoMunicipioDist(0);
  };
  const removeMunicipioRota = (idx: number) => setMunicipiosRota((prev) => prev.filter((_, i) => i !== idx));

  // ── Custo handlers ──
  const addCusto = () => {
    setCustos((prev) => [
      ...prev,
      { _key: custoKeyRef++, categoria: "veiculo", valor_unitario: 0, quantidade: 1, frequencia: "diario", km_dia: kmMedioDiario },
    ]);
  };
  const removeCusto = (key: number) => setCustos((prev) => prev.filter((c) => c._key !== key));
  const updateCusto = (key: number, field: string, value: any) => {
    setCustos((prev) => prev.map((c) => (c._key === key ? { ...c, [field]: value } : c)));
  };

  // ── Equipe handlers ──
  const addEquipe = () => {
    setEquipes((prev) => [
      ...prev,
      { _key: equipeKeyRef++, nome: "", quantidade_pessoas: 1, custo_deslocamento: 0, custo_hospedagem: 0, custo_alimentacao: 0 },
    ]);
  };
  const removeEquipe = (key: number) => setEquipes((prev) => prev.filter((e) => e._key !== key));
  const updateEquipe = (key: number, field: string, value: any) => {
    setEquipes((prev) => prev.map((e) => (e._key === key ? { ...e, [field]: value } : e)));
  };

  // Max bar for chart
  const maxPrecip = pluviometria ? Math.max(...pluviometria.mensal.map((m) => m.precipitacao_max), 1) : 1;

  return (
    <TooltipProvider>
      <div className="page-container animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">Mobilização e Administração Local</h1>
            <p className="page-subtitle">
              Planejamento de custos de deslocamento, hospedagem e logística de campo
            </p>
          </div>
          <Button className="gap-2" disabled>
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Coluna Esquerda: Entradas ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mapa */}
            <Card>
              <CardContent className="p-0">
                <div className="h-[300px] rounded-lg overflow-hidden">
                  {lat && lng ? (
                    <LeafletMap
                      projectLat={lat}
                      projectLng={lng}
                      baseLat={baseLat || lat}
                      baseLng={baseLng || lng}
                      municipio={municipio}
                      baseEndereco=""
                      geoJsonData={geoJsonData}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted/30 text-muted-foreground text-sm">
                      <MapPin className="w-5 h-5 mr-2" />
                      Importe um arquivo ou insira um município para visualizar o mapa
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Local do Projeto */}
            <Section title="Local do Projeto" icon={MapPin}>
              <Tabs value={modoLocalizacao} onValueChange={(v) => setModoLocalizacao(v as any)} className="mb-3">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="manual" className="text-xs gap-1.5">
                    <MapPin className="w-3 h-3" />
                    Inserir Manualmente
                  </TabsTrigger>
                  <TabsTrigger value="arquivo" className="text-xs gap-1.5">
                    <FileUp className="w-3 h-3" />
                    Importar KMZ / SHP
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="arquivo" className="mt-3">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">Formatos aceitos: .kmz, .kml, .shp, .zip</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => document.getElementById("geo-file-input")?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Selecionar Arquivo
                    </Button>
                    <input
                      id="geo-file-input"
                      type="file"
                      accept=".kmz,.kml,.shp,.zip"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setArquivoGeo(file.name);
                          setLoadingGeo(true);
                          setGeoProgress("Lendo arquivo...");
                          try {
                            const geojson = await parseGeoFile(file);
                            setGeoJsonData(geojson);
                            const center = getGeoJSONCenter(geojson);
                            if (center) {
                              setLat(Math.round(center.lat * 10000) / 10000);
                              setLng(Math.round(center.lng * 10000) / 10000);
                            }
                            toast.success(`Arquivo "${file.name}" carregado com ${geojson.features.length} feição(ões)`);
                            setLoadingMunicipios(true);
                            setGeoProgress("Identificando municípios...");
                            const munis = await findMunicipiosFromGeoJSON(geojson, (cur, total) => {
                              setGeoProgress(`Geocodificando ponto ${cur}/${total}...`);
                            });
                            if (munis.length > 0) {
                              setMunicipiosRota(munis);
                              setMunicipio(munis[0].nome);
                              setEstado(munis[0].uf);
                              toast.success(`${munis.length} município(s) identificado(s)`);
                            }
                          } catch (err: any) {
                            console.error("Erro parsing geo:", err);
                            toast.error("Erro ao ler arquivo: " + (err.message || "formato inválido"));
                          } finally {
                            setLoadingGeo(false);
                            setLoadingMunicipios(false);
                            setGeoProgress("");
                          }
                        }
                        e.target.value = "";
                      }}
                    />
                    {(loadingGeo || loadingMunicipios) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {geoProgress}
                      </div>
                    )}
                    {arquivoGeo && (
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <FileUp className="w-3 h-3" />
                          {arquivoGeo}
                          {geoJsonData && (
                            <span className="text-muted-foreground">({geoJsonData.features.length} feições)</span>
                          )}
                          <button onClick={() => {
                            setArquivoGeo("");
                            setGeoJsonData(null);
                          }} className="ml-1 hover:text-destructive">×</button>
                        </Badge>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Município</Label>
                      <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Ex: Presidente Prudente" />
                    </div>
                    <div>
                      <Label className="text-xs">Estado</Label>
                      <Input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="SP" maxLength={2} />
                    </div>
                  </div>
                  {lat && lng && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      📍 Coordenadas: {lat.toFixed(4)}, {lng.toFixed(4)}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </Section>

            {/* Parâmetros Operacionais */}
            <Section title="Parâmetros Operacionais" icon={Calculator}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data Início
                  </Label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Duração (meses)</Label>
                  <Input type="number" value={duracaoMeses} onChange={(e) => setDuracaoMeses(Number(e.target.value))} min={1} max={120} />
                </div>
                <div>
                  <Label className="text-xs">Dias Úteis/Mês</Label>
                  <Input type="number" value={diasUteisMes} onChange={(e) => {
                    const v = Number(e.target.value);
                    setDiasUteisMes(v);
                    setDiasTrabalho(v);
                  }} min={1} max={31} />
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-muted-foreground pb-2 space-y-0.5">
                    <div>Fim previsto: {new Date(dataFim).toLocaleDateString("pt-BR")}</div>
                    <div className="inline-flex items-center gap-1">
                      <Sun className="w-3 h-3 text-primary" /> {diasProdutivos} produtivos ({diasProdutivosMes}/mês)
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-muted-foreground" /> {diasImprodutivos} improdutivos ({diasImprodutivosMes}/mês)
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Jornada Diária (h)</Label>
                  <Input type="number" value={jornadaDiaria} onChange={(e) => setJornadaDiaria(Number(e.target.value))} step="0.5" />
                </div>
                <div>
                  <Label className="text-xs">Dist. Média Diária (km)</Label>
                  <Input type="number" value={distanciaMedia} onChange={(e) => setDistanciaMedia(Number(e.target.value))} />
                </div>
                <div className="flex items-end col-span-2">
                  <div className="text-xs text-muted-foreground pb-2">
                    Horas totais: {(diasProdutivos * jornadaDiaria).toFixed(0)}h · Total dias úteis: {diasUteisMes * duracaoMeses}d
                  </div>
                </div>
              </div>
            </Section>

  const [mobDesmobLoading, setMobDesmobLoading] = useState<Record<number, boolean>>({});
  const [mobDesmobRotasUrl, setMobDesmobRotasUrl] = useState<Record<number, string>>({});

  const calcularRotaMobDesmob = async (key: number) => {
    const item = mobDesmobItens.find((i) => i._key === key);
    if (!item) return;
    if (!item.municipio_saida || !item.estado_saida) {
      toast.error("Preencha o município e estado de saída");
      return;
    }
    if (!municipio && !lat) {
      toast.error("Defina o local do projeto primeiro");
      return;
    }

    setMobDesmobLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("calcular-rota", {
        body: {
          origem_municipio: item.municipio_saida,
          origem_estado: item.estado_saida,
          destino_municipio: municipio || undefined,
          destino_estado: estado || undefined,
          destino_lat: lat || undefined,
          destino_lng: lng || undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao calcular rota");

      updateMobDesmob(key, "distancia_km", data.distancia_km);
      setMobDesmobRotasUrl((prev) => ({ ...prev, [key]: data.rotas_brasil_url }));
      toast.success(`Rota calculada: ${data.distancia_km} km (~${data.duracao_horas}h)`);
    } catch (err: any) {
      console.error("Erro ao calcular rota:", err);
      toast.error(err.message || "Erro ao calcular rota");
    } finally {
      setMobDesmobLoading((prev) => ({ ...prev, [key]: false }));
    }
  };


            {/* Municípios na Rota */}
            <Section title="Municípios na Rota" icon={Navigation} defaultOpen={false} badge={`${municipiosRota.length}`}>
              <p className="text-xs text-muted-foreground mb-3">
                Municípios ao longo da rota entre a base e o local do projeto. Preparado para integração com API de roteamento.
              </p>
              {municipiosRota.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {municipiosRota.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/30">
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      <span className="font-medium flex-1">{m.nome}{m.uf ? ` - ${m.uf}` : ""}</span>
                      <span className="text-muted-foreground">{m.distancia_km} km</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMunicipioRota(i)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-[10px]">Município</Label>
                  <Input className="h-8 text-xs" value={novoMunicipioNome} onChange={(e) => setNovoMunicipioNome(e.target.value)} placeholder="Nome do município" />
                </div>
                <div className="w-16">
                  <Label className="text-[10px]">UF</Label>
                  <Input className="h-8 text-xs" value={novoMunicipioUF} onChange={(e) => setNovoMunicipioUF(e.target.value)} placeholder="SP" maxLength={2} />
                </div>
                <div className="w-24">
                  <Label className="text-[10px]">Dist. (km)</Label>
                  <Input className="h-8 text-xs" type="number" value={novoMunicipioDist} onChange={(e) => setNovoMunicipioDist(Number(e.target.value))} />
                </div>
                <Button variant="outline" size="sm" className="gap-1 h-8" onClick={addMunicipioRota}>
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
            </Section>

            {/* Análise Pluviométrica */}
            <Section title="Análise Pluviométrica (NASA POWER)" icon={CloudRain} defaultOpen={false}>
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      Consulta dados satelitais de precipitação (NASA POWER) dos últimos 5 anos para estimar o regime de chuvas
                      mês a mês durante a duração do projeto. O resultado atualiza automaticamente os dias de chuva/mês.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={buscarPluviometria}
                    disabled={loadingPluv}
                  >
                    {loadingPluv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudRain className="w-3.5 h-3.5" />}
                    {loadingPluv ? "Consultando..." : "Consultar NASA POWER"}
                  </Button>
                </div>

                {pluviometria && (
                  <div className="space-y-3 pt-2">
                    {/* Station info */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="text-xs font-medium mb-1">Estação Meteorológica</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium">{pluviometria.estacao.nome}</span>
                        <span className="text-muted-foreground">Código:</span>
                        <span>{pluviometria.estacao.codigo}</span>
                        <span className="text-muted-foreground">Distância:</span>
                        <span>{pluviometria.estacao.distancia_km} km do projeto</span>
                        <span className="text-muted-foreground">UF:</span>
                        <span>{pluviometria.estacao.uf}</span>
                        <span className="text-muted-foreground">Anos analisados:</span>
                        <span>{pluviometria.anos_analisados?.join(', ') || '—'}</span>
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="p-2 rounded-md bg-primary/10 text-center">
                        <div className="text-lg font-bold text-primary">{pluviometria.resumo.precipitacao_total_mm}</div>
                        <div className="text-[10px] text-muted-foreground">mm total (média)</div>
                      </div>
                      <div className="p-2 rounded-md bg-primary/10 text-center">
                        <div className="text-lg font-bold text-primary">{pluviometria.resumo.dias_com_chuva}</div>
                        <div className="text-[10px] text-muted-foreground">dias c/ chuva (média)</div>
                      </div>
                      <div className="p-2 rounded-md bg-primary/10 text-center">
                        <div className="text-lg font-bold text-primary">{pluviometria.resumo.media_dias_chuva_mes}</div>
                        <div className="text-[10px] text-muted-foreground">dias chuva/mês</div>
                      </div>
                      <div className="p-2 rounded-md bg-primary/10 text-center">
                        <div className="text-lg font-bold text-primary">{pluviometria.resumo.media_precipitacao_diaria_mm}</div>
                        <div className="text-[10px] text-muted-foreground">mm/dia médio</div>
                      </div>
                    </div>

                    {/* Monthly chart - average with min/max range */}
                    <div>
                      <div className="text-xs font-medium mb-2 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> Precipitação Estimada por Mês do Projeto (média histórica)
                      </div>
                      <div className="space-y-1.5">
                        {pluviometria.mensal.map((m) => {
                          const pctAvg = (m.precipitacao_media / maxPrecip) * 100;
                          const pctMax = (m.precipitacao_max / maxPrecip) * 100;
                          return (
                            <div key={m.mes} className="space-y-0.5">
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="w-10 text-right font-medium">{m.mes}</span>
                                <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden relative">
                                  {/* Max range background */}
                                  <div
                                    className="absolute h-full bg-primary/15 rounded-sm"
                                    style={{ width: `${Math.max(pctMax, 2)}%` }}
                                  />
                                  {/* Average bar */}
                                  <div
                                    className="relative h-full bg-primary/60 rounded-sm flex items-center px-1"
                                    style={{ width: `${Math.max(pctAvg, 2)}%` }}
                                  >
                                    {pctAvg > 25 && (
                                      <span className="text-[9px] text-primary-foreground font-medium">
                                        {m.precipitacao_media}mm
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {pctAvg <= 25 && (
                                  <span className="text-[9px] text-muted-foreground w-14">{m.precipitacao_media}mm</span>
                                )}
                                <span className="w-20 text-[9px] text-muted-foreground">
                                  {m.dias_chuva_media}d chuva
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground pl-12">
                                <span>min: {m.precipitacao_min}mm</span>
                                <span>·</span>
                                <span>máx: {m.precipitacao_max}mm</span>
                                <span>·</span>
                                <span>{m.anos_dados} anos</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>


            {/* Hospedagem */}
            <Section title="Hospedagem" icon={Home} badge={fmt(custoHospedagemTotal) + " total"}>
              {/* Duração da hospedagem */}
              <div className="flex items-end gap-3 mb-3 p-2 rounded-lg bg-muted/20 border">
                <div className="w-32">
                  <Label className="text-[10px]">Duração (meses)</Label>
                  <Input className="h-8 text-xs" type="number" value={duracaoHospedagemMeses} onChange={(e) => handleDuracaoHospedagem(Number(e.target.value))} min={1} />
                </div>
                <div className="text-[10px] text-muted-foreground pb-1.5 space-y-0.5">
                  <div>Mensal: <span className="font-medium text-foreground">{fmt(custoHospedagemMensal)}</span></div>
                  <div>Total ({duracaoHospedagemMeses}m): <span className="font-bold text-primary">{fmt(custoHospedagemTotal)}</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "hotel" as const, label: "Hotel (Diárias)", desc: "Quartos single, duplo ou triplo com valor por diária" },
                    { value: "alojamento_mobiliado" as const, label: "Alojamento Mobiliado", desc: "Imóvel já mobiliado com aluguel mensal fixo" },
                    { value: "alojamento_mobiliar" as const, label: "Alojamento a Mobiliar", desc: "Imóvel sem mobília: aluguel + custo de mobília com revenda" },
                  ]).map((opt) => (
                    <div
                      key={opt.value}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${tipoHospedagem === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                      onClick={() => setTipoHospedagem(opt.value)}
                    >
                      <div className="text-xs font-medium">{opt.label}</div>
                      <p className="text-[10px] text-muted-foreground mt-1">{opt.desc}</p>
                    </div>
                  ))}
                </div>

                {tipoHospedagem === "hotel" && (
                  <div className="space-y-2">
                    {quartosHotel.map((q) => (
                      <div key={q._key} className="flex items-end gap-2 p-2 rounded-lg border bg-muted/30">
                        <div className="w-28">
                          <Label className="text-[10px]">Tipo</Label>
                          <Select value={q.tipo} onValueChange={(v) => updateQuarto(q._key, "tipo", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="duplo">Duplo</SelectItem>
                              <SelectItem value="triplo">Triplo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-28">
                          <Label className="text-[10px]">Diária (R$)</Label>
                          <Input className="h-8 text-xs" type="number" value={q.diaria} onChange={(e) => updateQuarto(q._key, "diaria", Number(e.target.value))} step="0.01" />
                        </div>
                        <div className="w-20">
                          <Label className="text-[10px]">Quartos</Label>
                          <Input className="h-8 text-xs" type="number" value={q.quantidade} onChange={(e) => updateQuarto(q._key, "quantidade", Number(e.target.value))} min={1} />
                        </div>
                        <div className="flex-1 text-[10px] text-muted-foreground pb-1.5">
                          {fmt(q.diaria * q.quantidade * diasTrabalho)}/mês ({diasTrabalho}d)
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeQuarto(q._key)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="gap-1" onClick={addQuarto}>
                      <Plus className="w-3 h-3" /> Adicionar Quarto
                    </Button>
                  </div>
                )}

                {tipoHospedagem === "alojamento_mobiliado" && (
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border">
                    <div>
                      <Label className="text-[10px]">Valor Mensal (R$)</Label>
                      <Input className="h-8 text-xs" type="number" value={alojamentoMobiliadoValor} onChange={(e) => setAlojamentoMobiliadoValor(Number(e.target.value))} step="0.01" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Quantidade</Label>
                      <Input className="h-8 text-xs" type="number" value={alojamentoMobiliadoQtd} onChange={(e) => setAlojamentoMobiliadoQtd(Number(e.target.value))} min={1} />
                    </div>
                    <div className="flex items-end">
                      <div className="text-[10px] text-muted-foreground pb-1.5">
                        Total: <span className="font-medium text-foreground">{fmt(alojamentoMobiliadoValor * alojamentoMobiliadoQtd)}</span>/mês
                      </div>
                    </div>
                  </div>
                )}

                {tipoHospedagem === "alojamento_mobiliar" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30 border">
                      <div>
                        <Label className="text-[10px]">Aluguel Mensal (R$)</Label>
                        <Input className="h-8 text-xs" type="number" value={alojamentoMobiliarAluguel} onChange={(e) => setAlojamentoMobiliarAluguel(Number(e.target.value))} step="0.01" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Quantidade</Label>
                        <Input className="h-8 text-xs" type="number" value={alojamentoMobiliarQtd} onChange={(e) => setAlojamentoMobiliarQtd(Number(e.target.value))} min={1} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Custo Mobília (R$)</Label>
                        <Input className="h-8 text-xs" type="number" value={alojamentoMobiliarMobilia} onChange={(e) => setAlojamentoMobiliarMobilia(Number(e.target.value))} step="0.01" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Revenda (%)</Label>
                        <Input className="h-8 text-xs" type="number" value={alojamentoMobiliarRevenda} onChange={(e) => setAlojamentoMobiliarRevenda(Number(e.target.value))} min={0} max={100} />
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/20 border text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aluguel/mês:</span>
                        <span className="font-medium">{fmt(alojamentoMobiliarAluguel * alojamentoMobiliarQtd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mobília total:</span>
                        <span className="font-medium">{fmt(alojamentoMobiliarMobilia * alojamentoMobiliarQtd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Revenda ({alojamentoMobiliarRevenda}%):</span>
                        <span className="font-medium text-primary">- {fmt(alojamentoMobiliarMobilia * alojamentoMobiliarQtd * alojamentoMobiliarRevenda / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custo líquido mobília:</span>
                        <span className="font-medium">{fmt(alojamentoMobiliarMobilia * alojamentoMobiliarQtd * (1 - alojamentoMobiliarRevenda / 100))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amortização/mês ({duracaoHospedagemMeses}m):</span>
                        <span className="font-medium">{fmt(duracaoHospedagemMeses > 0 ? (alojamentoMobiliarMobilia * alojamentoMobiliarQtd * (1 - alojamentoMobiliarRevenda / 100)) / duracaoHospedagemMeses : 0)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between text-xs font-bold">
                        <span>Total/mês:</span>
                        <span className="text-primary">{fmt(custoHospedagemMensal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Veículos e Deslocamento" icon={Truck} badge={`${custos.length} veículos`}>
              <div className="space-y-3">
                {custos.map((c) => {
                  const CatIcon = ICON_MAP[c.categoria] || CreditCard;
                   const selectedVeiculo = c.veiculo_id ? (veiculosCadastrados as any[])?.find((v: any) => v.id === c.veiculo_id) : null;
                   const mediaKmL = selectedVeiculo?.media_km_l || 0;
                   const precoComb = c.preco_combustivel || 0;
                   const custoKmCalc = mediaKmL > 0 ? precoComb / mediaKmL : 0;
                   const custoDiaCalc = custoKmCalc * (c.km_dia || 0);
                   const custoTotalCalc = custoDiaCalc * diasProdutivos * c.quantidade;
                  return (
                    <div key={c._key} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                      <CatIcon className="w-4 h-4 mt-2 text-muted-foreground shrink-0" />
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-1">
                        <div>
                          <Label className="text-[10px]">Categoria</Label>
                          <Select value={c.categoria} onValueChange={(v) => updateCusto(c._key, "categoria", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIAS_CUSTO.filter(cat => cat.value !== "hospedagem" && cat.value !== "alimentacao").map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">Veículo</Label>
                          <Select
                            value={c.veiculo_id || ""}
                            onValueChange={(v) => {
                              const veic = (veiculosCadastrados as any[])?.find((ve: any) => ve.id === v);
                              updateCusto(c._key, "veiculo_id", v);
                              if (veic) {
                              updateCusto(c._key, "descricao", veic.nome);
                                updateCusto(c._key, "preco_combustivel", veic.combustivel_preco_litro || 0);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {(veiculosCadastrados as any[])?.map((v: any) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.nome} ({Number(v.media_km_l || 0).toFixed(1)} km/L)
                                </SelectItem>
                              ))}
                              {(!veiculosCadastrados || (veiculosCadastrados as any[]).length === 0) && (
                                <SelectItem value="_none" disabled>Nenhum veículo cadastrado</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">Km/dia</Label>
                          <Input className="h-8 text-xs" type="number" value={c.km_dia || ""} onChange={(e) => updateCusto(c._key, "km_dia", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-[10px]">Combustível (R$/L)</Label>
                          <Input className="h-8 text-xs" type="number" step="0.01" value={c.preco_combustivel || ""} onChange={(e) => updateCusto(c._key, "preco_combustivel", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-[10px]">Qtde Veículos</Label>
                          <Input className="h-8 text-xs" type="number" value={c.quantidade} onChange={(e) => updateCusto(c._key, "quantidade", Number(e.target.value))} min={1} />
                        </div>
                        <div className="flex items-end">
                          <div className="text-[10px] text-muted-foreground pb-1.5 space-y-0.5">
                            {selectedVeiculo ? (
                              <>
                                <div>{mediaKmL.toFixed(1)} km/L · {selectedVeiculo.tipo_combustivel || "diesel"}</div>
                                <div>{fmt(custoKmCalc)}/km · {fmt(custoDiaCalc)}/dia</div>
                                <div className="font-medium text-foreground">{fmt(custoTotalCalc)} total ({diasProdutivos}d)</div>
                              </>
                            ) : (
                              <span>Selecione um veículo</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-1" onClick={() => removeCusto(c._key)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="gap-1" onClick={addCusto}>
                  <Plus className="w-3 h-3" /> Adicionar Veículo
                </Button>
              </div>
            </Section>

            {/* Mobilização / Desmobilização */}
            <Section title="Mobilização / Desmobilização" icon={Route} badge={mobDesmobItens.length > 0 ? fmt(custoMobDesmobTotal) + " total" : undefined}>
              <p className="text-xs text-muted-foreground mb-3">
                Calcule o custo de deslocamento da equipe do local de saída até o projeto (ida + volta). 
                Pernoites são calculados automaticamente com base no km máximo/dia.
              </p>
              <div className="space-y-3">
                {mobDesmobItens.map((item) => {
                  const calc = calcularMobDesmobItem(item);
                  return (
                    <div key={item._key} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                          <div>
                            <Label className="text-[10px]">Município Saída</Label>
                            <Input className="h-8 text-xs" value={item.municipio_saida} onChange={(e) => updateMobDesmob(item._key, "municipio_saida", e.target.value)} placeholder="Ex: São Paulo" />
                          </div>
                          <div>
                            <Label className="text-[10px]">Estado</Label>
                            <Select value={item.estado_saida} onValueChange={(v) => updateMobDesmob(item._key, "estado_saida", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="UF" /></SelectTrigger>
                              <SelectContent>
                                {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px]">Veículo</Label>
                            <Select value={item.veiculo_id} onValueChange={(v) => updateMobDesmob(item._key, "veiculo_id", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {(veiculosCadastrados as any[])?.map((v: any) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.nome} ({Number(v.media_km_l || 0).toFixed(1)} km/L)
                                  </SelectItem>
                                ))}
                                {(!veiculosCadastrados || (veiculosCadastrados as any[]).length === 0) && (
                                  <SelectItem value="_none" disabled>Nenhum veículo cadastrado</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px]">Distância (km)</Label>
                            <Input className="h-8 text-xs" type="number" value={item.distancia_km || ""} onChange={(e) => updateMobDesmob(item._key, "distancia_km", Number(e.target.value))} placeholder="km total ida" />
                          </div>
                          <div>
                            <Label className="text-[10px]">Km Máx/Dia</Label>
                            <Input className="h-8 text-xs" type="number" value={item.km_max_dia} onChange={(e) => updateMobDesmob(item._key, "km_max_dia", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Hospedagem/Pernoite</Label>
                            <Input className="h-8 text-xs" type="number" step="0.01" value={item.hospedagem_pernoite} onChange={(e) => updateMobDesmob(item._key, "hospedagem_pernoite", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Pedágios (ida)</Label>
                            <Input className="h-8 text-xs" type="number" step="0.01" value={item.pedagios_ida || ""} onChange={(e) => updateMobDesmob(item._key, "pedagios_ida", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Pessoas</Label>
                            <Input className="h-8 text-xs" type="number" value={item.quantidade_pessoas} onChange={(e) => updateMobDesmob(item._key, "quantidade_pessoas", Number(e.target.value))} min={1} />
                          </div>
                          <div>
                            <Label className="text-[10px]">Veículos</Label>
                            <Input className="h-8 text-xs" type="number" value={item.quantidade_veiculos} onChange={(e) => updateMobDesmob(item._key, "quantidade_veiculos", Number(e.target.value))} min={1} />
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 ml-2" onClick={() => removeMobDesmob(item._key)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                      {calc.veic && item.distancia_km > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/50">
                          <div className="text-[10px] text-muted-foreground">
                            <span className="block font-medium text-foreground">{calc.diasViagem} dia(s) de viagem</span>
                            {calc.pernoites} pernoite(s)
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            <span className="block">Combustível (ida): <span className="font-medium text-foreground">{fmt(calc.custoCombustivelIda)}</span></span>
                            <span>{calc.mediaKmL.toFixed(1)} km/L · {fmt(calc.custoKm)}/km</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            <span className="block">Pernoite (ida): <span className="font-medium text-foreground">{fmt(calc.custoPernoiteIda)}</span></span>
                            <span>Pedágios (ida): {fmt(item.pedagios_ida)}</span>
                          </div>
                          <div className="text-[10px]">
                            <span className="block text-muted-foreground">Ida: {fmt(calc.custoIda)}</span>
                            <span className="block font-bold text-primary">Ida+Volta: {fmt(calc.custoTotal)}</span>
                          </div>
                        </div>
                      )}
                      {!calc.veic && (
                        <div className="text-[10px] text-muted-foreground pt-1">Selecione um veículo para calcular</div>
                      )}
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="gap-1" onClick={addMobDesmob}>
                  <Plus className="w-3 h-3" /> Adicionar Deslocamento
                </Button>
              </div>
            </Section>


          </div>

          {/* ── Coluna Direita: Resumo ── */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  Resumo de Custos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dias */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-md bg-primary/10 text-center">
                    <div className="text-lg font-bold text-primary">{diasProdutivos}</div>
                    <div className="text-[10px] text-muted-foreground">Dias Produtivos</div>
                  </div>
                  <div className="p-2 rounded-md bg-destructive/10 text-center">
                    <div className="text-lg font-bold text-destructive">{diasImprodutivos}</div>
                    <div className="text-[10px] text-muted-foreground">Dias Improdutivos</div>
                  </div>
                </div>

                <Separator />

                {/* Distâncias */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Distâncias</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Base → Projeto</span>
                      <span className="font-medium">{distanciaBase} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Média diária</span>
                      <span className="font-medium">{distanciaMedia} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total estimado</span>
                      <span className="font-medium">
                        {((distanciaBase * 2) + (distanciaMedia * diasProdutivos)).toLocaleString("pt-BR")} km
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Custos por categoria */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Custos por Categoria</div>
                  <div className="space-y-1.5">
                    {/* Hospedagem (separada) */}
                    {custoHospedagemTotal > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <Home className="w-3 h-3 text-muted-foreground" />
                          Hospedagem ({duracaoHospedagemMeses}m)
                        </span>
                        <span className="font-medium">{fmt(custoHospedagemTotal)}</span>
                      </div>
                    )}
                    {/* Combustível (km rodado) */}
                    {custoCombustivelTotal > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <Fuel className="w-3 h-3 text-muted-foreground" />
                          Combustível ({duracaoMeses}m)
                        </span>
                        <span className="font-medium">{fmt(custoCombustivelTotal)}</span>
                      </div>
                    )}
                    {Object.entries(resultado.custos_por_categoria)
                      .filter(([cat, v]) => v > 0 && cat !== "hospedagem" && cat !== "alimentacao")
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, valor]) => {
                        const catInfo = CATEGORIAS_CUSTO.find((c) => c.value === cat);
                        const CatIcon = ICON_MAP[cat] || Users;
                        const valorTotal = valor * duracaoMeses;
                        return (
                          <div key={cat} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <CatIcon className="w-3 h-3 text-muted-foreground" />
                              {catInfo?.label || cat}
                            </span>
                            <span className="font-medium">{fmt(valorTotal)}</span>
                          </div>
                        );
                      })}
                    {/* Mob/Desmob */}
                    {custoMobDesmobTotal > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <Route className="w-3 h-3 text-muted-foreground" />
                          Mob/Desmob (ida+volta)
                        </span>
                        <span className="font-medium">{fmt(custoMobDesmobTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-primary">
                    <span>Custo Total</span>
                    <span>{fmt((resultado.custo_total * duracaoMeses) + custoHospedagemTotal + custoCombustivelTotal + custoMobDesmobTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Custo/Dia</span>
                    <span className="font-medium">{fmt(diasProdutivos > 0 ? ((resultado.custo_total * duracaoMeses) + custoHospedagemTotal + custoCombustivelTotal + custoMobDesmobTotal) / diasProdutivos : 0)}</span>
                  </div>
                
                </div>

                {/* Município */}
                {municipio && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Local</div>
                      <div className="text-xs">
                        <Badge variant="outline">{municipio}{estado ? ` - ${estado}` : ""}</Badge>
                      </div>
                    </div>
                  </>
                )}

                {/* Municípios na rota */}
                {municipiosRota.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Municípios na Rota</div>
                      <div className="flex flex-wrap gap-1">
                        {municipiosRota.map((m, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{m.nome}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

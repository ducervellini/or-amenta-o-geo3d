import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  MapPin, Plus, Trash2, Save, Loader2, Cloud, Sun,
  Truck, Home, Utensils, Fuel, CreditCard, Plane,
  Users, Calculator, ChevronDown, ChevronUp, Info, Upload,
  FileUp, Navigation, CloudRain, BarChart3, Calendar
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
  resumo: {
    precipitacao_total_mm: number;
    dias_com_chuva: number;
    dias_registrados: number;
    media_dias_chuva_mes: number;
    media_precipitacao_diaria_mm: number;
  };
  mensal: {
    mes: string;
    precipitacao_total: number;
    dias_chuva: number;
    dias_registro: number;
    precipitacao_media_diaria: number;
  }[];
}

// ── Plain Leaflet Map Component ──
function LeafletMap({
  projectLat, projectLng, baseLat, baseLng, municipio, baseEndereco, municipiosRota,
}: {
  projectLat: number; projectLng: number;
  baseLat: number; baseLng: number;
  municipio: string; baseEndereco: string;
  municipiosRota?: MunicipioRota[];
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);

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

    mapRef.current.setView([projectLat, projectLng], 8);
  }, [projectLat, projectLng, baseLat, baseLng, municipio, baseEndereco]);

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
  const [lat, setLat] = useState(-15.78);
  const [lng, setLng] = useState(-47.93);
  const [baseEndereco, setBaseEndereco] = useState("");
  const [arquivoGeo, setArquivoGeo] = useState("");
  const [baseLat, setBaseLat] = useState(-15.78);
  const [baseLng, setBaseLng] = useState(-47.93);
  const [diasTrabalho, setDiasTrabalho] = useState(30);
  const [jornadaDiaria, setJornadaDiaria] = useState(8);
  const [diasChuvaMes, setDiasChuvaMes] = useState(5);
  const [fatorImprod, setFatorImprod] = useState(0.15);
  const [distanciaBase, setDistanciaBase] = useState(50);
  const [distanciaMedia, setDistanciaMedia] = useState(30);

  // Datas do projeto
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });

  // Municípios na rota
  const [municipiosRota, setMunicipiosRota] = useState<MunicipioRota[]>([]);
  const [novoMunicipioNome, setNovoMunicipioNome] = useState("");
  const [novoMunicipioUF, setNovoMunicipioUF] = useState("");
  const [novoMunicipioDist, setNovoMunicipioDist] = useState(0);

  // Pluviometria
  const [pluviometria, setPluviometria] = useState<PluviometriaResult | null>(null);
  const [loadingPluv, setLoadingPluv] = useState(false);

  // Custos
  const [custos, setCustos] = useState<(CustoItem & { _key: number })[]>([
    { _key: 1, categoria: "hospedagem", descricao: "Diária hotel", valor_unitario: 150, quantidade: 1, frequencia: "diario" },
    { _key: 2, categoria: "alimentacao", descricao: "Alimentação/dia", valor_unitario: 80, quantidade: 1, frequencia: "diario" },
    { _key: 3, categoria: "combustivel", descricao: "Diesel", valor_unitario: 6.5, quantidade: 1, frequencia: "diario", consumo_km: 8, preco_litro: 6.5 },
  ]);
  let custoKeyRef = 4;

  // Equipes
  const [equipes, setEquipes] = useState<(EquipeItem & { _key: number })[]>([
    { _key: 1, nome: "Equipe Campo", quantidade_pessoas: 4, custo_deslocamento: 0, custo_hospedagem: 150, custo_alimentacao: 80 },
  ]);
  let equipeKeyRef = 2;

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
    [diasTrabalho, jornadaDiaria, diasChuvaMes, fatorImprod, distanciaBase, distanciaMedia, custos, equipes]
  );

  const { diasProdutivos, diasImprodutivos } = calcularDiasProdutivos(params);

  // ── Pluviometria INMET ──
  const buscarPluviometria = async () => {
    if (!lat || !lng) {
      toast.error("Informe latitude e longitude do projeto");
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
      toast.error("Erro ao consultar INMET: " + (err.message || "tente novamente"));
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
      { _key: custoKeyRef++, categoria: "hospedagem", valor_unitario: 0, quantidade: 1, frequencia: "diario" },
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
  const maxPrecip = pluviometria ? Math.max(...pluviometria.mensal.map((m) => m.precipitacao_total), 1) : 1;

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
                  <LeafletMap
                    projectLat={lat}
                    projectLng={lng}
                    baseLat={baseLat}
                    baseLng={baseLng}
                    municipio={municipio}
                    baseEndereco={baseEndereco}
                    municipiosRota={municipiosRota}
                  />
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setArquivoGeo(file.name);
                          toast.info(`Arquivo "${file.name}" carregado. Parsing de coordenadas será implementado com API geográfica.`);
                        }
                        e.target.value = "";
                      }}
                    />
                    {arquivoGeo && (
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <FileUp className="w-3 h-3" />
                          {arquivoGeo}
                          <button onClick={() => setArquivoGeo("")} className="ml-1 hover:text-destructive">×</button>
                        </Badge>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Município</Label>
                      <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Ex: São Paulo" />
                    </div>
                    <div>
                      <Label className="text-xs">Estado</Label>
                      <Input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="SP" />
                    </div>
                    <div>
                      <Label className="text-xs">Latitude</Label>
                      <Input type="number" value={lat} onChange={(e) => setLat(Number(e.target.value))} step="0.0001" />
                    </div>
                    <div>
                      <Label className="text-xs">Longitude</Label>
                      <Input type="number" value={lng} onChange={(e) => setLng(Number(e.target.value))} step="0.0001" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Ponto de Partida (sempre visível) */}
              <Separator className="my-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Endereço da Base (ponto de partida)</Label>
                  <Input value={baseEndereco} onChange={(e) => setBaseEndereco(e.target.value)} placeholder="Endereço ou cidade de origem" />
                </div>
                <div>
                  <Label className="text-xs">Dist. Base→Projeto (km)</Label>
                  <Input type="number" value={distanciaBase} onChange={(e) => setDistanciaBase(Number(e.target.value))} />
                </div>
              </div>

              {/* Datas do Projeto */}
              <Separator className="my-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data Início
                  </Label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data Fim
                  </Label>
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-muted-foreground pb-2">
                    Duração: {Math.round((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24))} dias
                  </div>
                </div>
              </div>
            </Section>

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
            <Section title="Análise Pluviométrica (INMET)" icon={CloudRain} defaultOpen={false}>
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">
                      Consulta dados históricos de precipitação do INMET para a estação mais próxima do local do projeto,
                      no período definido. O resultado atualiza automaticamente os dias de chuva/mês.
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
                    {loadingPluv ? "Consultando..." : "Consultar INMET"}
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
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="p-2 rounded-md bg-primary/10 text-center">
                        <div className="text-lg font-bold text-primary">{pluviometria.resumo.precipitacao_total_mm}</div>
                        <div className="text-[10px] text-muted-foreground">mm total</div>
                      </div>
                      <div className="p-2 rounded-md bg-primary/10 text-center">
                        <div className="text-lg font-bold text-primary">{pluviometria.resumo.dias_com_chuva}</div>
                        <div className="text-[10px] text-muted-foreground">dias c/ chuva</div>
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

                    {/* Monthly chart */}
                    <div>
                      <div className="text-xs font-medium mb-2 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> Precipitação Mensal (mm)
                      </div>
                      <div className="space-y-1">
                        {pluviometria.mensal.map((m) => {
                          const pct = (m.precipitacao_total / maxPrecip) * 100;
                          const mesLabel = new Date(m.mes + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
                          return (
                            <div key={m.mes} className="flex items-center gap-2 text-[11px]">
                              <span className="w-16 text-right text-muted-foreground">{mesLabel}</span>
                              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                                <div
                                  className="h-full bg-primary/60 rounded-sm flex items-center px-1"
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                >
                                  {pct > 20 && (
                                    <span className="text-[9px] text-primary-foreground font-medium">
                                      {Math.round(m.precipitacao_total)}mm
                                    </span>
                                  )}
                                </div>
                              </div>
                              {pct <= 20 && (
                                <span className="text-[9px] text-muted-foreground w-12">{Math.round(m.precipitacao_total)}mm</span>
                              )}
                              <span className="w-16 text-[9px] text-muted-foreground">{m.dias_chuva}d chuva</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Parâmetros Operacionais */}
            <Section title="Parâmetros Operacionais" icon={Calculator}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Dias de Trabalho</Label>
                  <Input type="number" value={diasTrabalho} onChange={(e) => setDiasTrabalho(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Jornada Diária (h)</Label>
                  <Input type="number" value={jornadaDiaria} onChange={(e) => setJornadaDiaria(Number(e.target.value))} step="0.5" />
                </div>
                <div>
                  <Label className="text-xs">Dist. Média Diária (km)</Label>
                  <Input type="number" value={distanciaMedia} onChange={(e) => setDistanciaMedia(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">—</Label>
                  <div className="text-xs text-muted-foreground pt-2">
                    Horas totais: {(diasProdutivos * jornadaDiaria).toFixed(0)}h
                  </div>
                </div>
              </div>
            </Section>

            {/* Clima */}
            <Section title="Clima e Improdutividade" icon={Cloud} defaultOpen={false}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Dias de Chuva/Mês</Label>
                  <Input type="number" value={diasChuvaMes} onChange={(e) => setDiasChuvaMes(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Fator Improdutividade</Label>
                  <Input type="number" value={fatorImprod} onChange={(e) => setFatorImprod(Number(e.target.value))} step="0.01" min="0" max="1" />
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-muted-foreground pb-2">
                    <span className="inline-flex items-center gap-1">
                      <Sun className="w-3 h-3 text-primary" /> {diasProdutivos} dias produtivos
                    </span>
                    <br />
                    <span className="inline-flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-primary" /> {diasImprodutivos} dias improdutivos
                    </span>
                  </div>
                </div>
              </div>
              {pluviometria && (
                <p className="text-[10px] text-primary mt-2">
                  ✓ Dias de chuva/mês baseados em dados históricos INMET (estação {pluviometria.estacao.nome})
                </p>
              )}
              {!pluviometria && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  ⓘ Use "Análise Pluviométrica" acima para preencher automaticamente com dados históricos INMET.
                </p>
              )}
            </Section>

            {/* Custos */}
            <Section title="Itens de Custo" icon={CreditCard} badge={`${custos.length} itens`}>
              <div className="space-y-3">
                {custos.map((c) => {
                  const CatIcon = ICON_MAP[c.categoria] || CreditCard;
                  return (
                    <div key={c._key} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                      <CatIcon className="w-4 h-4 mt-2 text-muted-foreground shrink-0" />
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-1">
                        <div>
                          <Label className="text-[10px]">Categoria</Label>
                          <Select value={c.categoria} onValueChange={(v) => updateCusto(c._key, "categoria", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIAS_CUSTO.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">Descrição</Label>
                          <Input className="h-8 text-xs" value={c.descricao || ""} onChange={(e) => updateCusto(c._key, "descricao", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-[10px]">Valor Unit. (R$)</Label>
                          <Input className="h-8 text-xs" type="number" value={c.valor_unitario} onChange={(e) => updateCusto(c._key, "valor_unitario", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-[10px]">Qtde</Label>
                          <Input className="h-8 text-xs" type="number" value={c.quantidade} onChange={(e) => updateCusto(c._key, "quantidade", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-[10px]">Frequência</Label>
                          <Select value={c.frequencia} onValueChange={(v) => updateCusto(c._key, "frequencia", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FREQUENCIAS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {c.categoria === "combustivel" && (
                          <>
                            <div>
                              <Label className="text-[10px]">Consumo (km/L)</Label>
                              <Input className="h-8 text-xs" type="number" value={c.consumo_km || ""} onChange={(e) => updateCusto(c._key, "consumo_km", Number(e.target.value))} />
                            </div>
                            <div>
                              <Label className="text-[10px]">Preço/Litro</Label>
                              <Input className="h-8 text-xs" type="number" value={c.preco_litro || ""} onChange={(e) => updateCusto(c._key, "preco_litro", Number(e.target.value))} />
                            </div>
                          </>
                        )}
                        {c.categoria === "veiculo" && (
                          <>
                            <div>
                              <Label className="text-[10px]">Propriedade</Label>
                              <Select value={c.tipo_propriedade || "proprio"} onValueChange={(v) => updateCusto(c._key, "tipo_propriedade", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="proprio">Próprio</SelectItem>
                                  <SelectItem value="alugado">Alugado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {c.tipo_propriedade === "alugado" && (
                              <div>
                                <Label className="text-[10px]">Valor Aluguel</Label>
                                <Input className="h-8 text-xs" type="number" value={c.valor_aluguel || ""} onChange={(e) => updateCusto(c._key, "valor_aluguel", Number(e.target.value))} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-1" onClick={() => removeCusto(c._key)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="gap-1" onClick={addCusto}>
                  <Plus className="w-3 h-3" /> Adicionar Custo
                </Button>
              </div>
            </Section>

            {/* Equipes */}
            <Section title="Equipes" icon={Users} badge={`${equipes.length}`}>
              <div className="space-y-3">
                {equipes.map((eq) => (
                  <div key={eq._key} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                    <Users className="w-4 h-4 mt-2 text-muted-foreground shrink-0" />
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-1">
                      <div>
                        <Label className="text-[10px]">Nome da Equipe</Label>
                        <Input className="h-8 text-xs" value={eq.nome} onChange={(e) => updateEquipe(eq._key, "nome", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Pessoas</Label>
                        <Input className="h-8 text-xs" type="number" value={eq.quantidade_pessoas} onChange={(e) => updateEquipe(eq._key, "quantidade_pessoas", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Hospedagem/dia</Label>
                        <Input className="h-8 text-xs" type="number" value={eq.custo_hospedagem} onChange={(e) => updateEquipe(eq._key, "custo_hospedagem", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Alimentação/dia</Label>
                        <Input className="h-8 text-xs" type="number" value={eq.custo_alimentacao} onChange={(e) => updateEquipe(eq._key, "custo_alimentacao", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Deslocamento/dia</Label>
                        <Input className="h-8 text-xs" type="number" value={eq.custo_deslocamento} onChange={(e) => updateEquipe(eq._key, "custo_deslocamento", Number(e.target.value))} />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-1" onClick={() => removeEquipe(eq._key)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1" onClick={addEquipe}>
                  <Plus className="w-3 h-3" /> Adicionar Equipe
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
                    <div className="text-lg font-bold text-primary">{resultado.dias_produtivos}</div>
                    <div className="text-[10px] text-muted-foreground">Dias Produtivos</div>
                  </div>
                  <div className="p-2 rounded-md bg-destructive/10 text-center">
                    <div className="text-lg font-bold text-destructive">{resultado.dias_improdutivos}</div>
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
                        {((distanciaBase * 2) + (distanciaMedia * resultado.dias_produtivos)).toLocaleString("pt-BR")} km
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Custos por categoria */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Custos por Categoria</div>
                  <div className="space-y-1.5">
                    {Object.entries(resultado.custos_por_categoria)
                      .filter(([, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, valor]) => {
                        const catInfo = CATEGORIAS_CUSTO.find((c) => c.value === cat);
                        const CatIcon = ICON_MAP[cat] || Users;
                        return (
                          <div key={cat} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <CatIcon className="w-3 h-3 text-muted-foreground" />
                              {catInfo?.label || cat}
                            </span>
                            <span className="font-medium">{fmt(valor)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <Separator />

                {/* Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-primary">
                    <span>Custo Total</span>
                    <span>{fmt(resultado.custo_total)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Custo/Dia</span>
                    <span className="font-medium">{fmt(resultado.custo_por_dia)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Custo/Pessoa</span>
                    <span className="font-medium">{fmt(resultado.custo_por_equipe)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Total equipe</span>
                    <span className="font-medium">{resultado.total_equipes} pessoas</span>
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

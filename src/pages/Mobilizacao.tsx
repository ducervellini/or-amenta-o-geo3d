import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  MapPin, Plus, Trash2, Save, Loader2, Cloud, Sun,
  Truck, Home, Utensils, Fuel, CreditCard, Plane,
  Users, Calculator, ChevronDown, ChevronUp, Info, Upload
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

// ── Plain Leaflet Map Component ──
function LeafletMap({
  projectLat, projectLng, baseLat, baseLng, municipio, baseEndereco,
}: {
  projectLat: number; projectLng: number;
  baseLat: number; baseLng: number;
  municipio: string; baseEndereco: string;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

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
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    // Add project marker
    if (projectLat && projectLng) {
      const m = L.marker([projectLat, projectLng])
        .addTo(mapRef.current)
        .bindPopup(`Projeto: ${municipio || "Local do projeto"}`);
      markersRef.current.push(m);
    }
    // Add base marker
    if (baseLat && baseLng && (baseLat !== projectLat || baseLng !== projectLng)) {
      const m = L.marker([baseLat, baseLng])
        .addTo(mapRef.current)
        .bindPopup(`Base: ${baseEndereco || "Ponto inicial"}`);
      markersRef.current.push(m);
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
  const [municipio, setMunicipio] = useState("");
  const [estado, setEstado] = useState("");
  const [lat, setLat] = useState(-15.78);
  const [lng, setLng] = useState(-47.93);
  const [baseEndereco, setBaseEndereco] = useState("");
  const [baseLat, setBaseLat] = useState(-15.78);
  const [baseLng, setBaseLng] = useState(-47.93);
  const [diasTrabalho, setDiasTrabalho] = useState(30);
  const [jornadaDiaria, setJornadaDiaria] = useState(8);
  const [diasChuvaMes, setDiasChuvaMes] = useState(5);
  const [fatorImprod, setFatorImprod] = useState(0.15);
  const [distanciaBase, setDistanciaBase] = useState(50);
  const [distanciaMedia, setDistanciaMedia] = useState(30);

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
                  />
                </div>
              </CardContent>
            </Card>

            {/* Local do Projeto */}
            <Section title="Local do Projeto" icon={MapPin}>
              <div className="flex items-center gap-2 mb-3">
                <Label className="text-xs font-medium text-muted-foreground">Importar arquivo geográfico:</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => document.getElementById("geo-file-input")?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar KMZ / SHP
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
                    }
                    e.target.value = "";
                  }}
                />
                {arquivoGeo && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {arquivoGeo}
                    <button onClick={() => setArquivoGeo("")} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
              </div>
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
                  <Input type="number" value={lat} onChange={(e) => setLat(Number(e.target.value))} step="0.01" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Endereço da Base</Label>
                  <Input value={baseEndereco} onChange={(e) => setBaseEndereco(e.target.value)} placeholder="Endereço do ponto de partida" />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input type="number" value={lng} onChange={(e) => setLng(Number(e.target.value))} step="0.01" />
                </div>
                <div>
                  <Label className="text-xs">Dist. Base→Projeto (km)</Label>
                  <Input type="number" value={distanciaBase} onChange={(e) => setDistanciaBase(Number(e.target.value))} />
                </div>
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
                      <Sun className="w-3 h-3 text-amber-500" /> {diasProdutivos} dias produtivos
                    </span>
                    <br />
                    <span className="inline-flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-blue-400" /> {diasImprodutivos} dias improdutivos
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                ⓘ Preparado para integração com API climática. Valores atuais são estimativas editáveis.
              </p>
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
                  <div className="p-2 rounded-md bg-emerald-500/10 text-center">
                    <div className="text-lg font-bold text-emerald-600">{resultado.dias_produtivos}</div>
                    <div className="text-[10px] text-muted-foreground">Dias Produtivos</div>
                  </div>
                  <div className="p-2 rounded-md bg-rose-500/10 text-center">
                    <div className="text-lg font-bold text-rose-500">{resultado.dias_improdutivos}</div>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

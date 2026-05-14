import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FeatureCollection } from "geojson";

// Fix Leaflet default icon (executes once on import)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LeafletMapProps {
  projectLat: number;
  projectLng: number;
  baseLat: number;
  baseLng: number;
  municipio: string;
  baseEndereco: string;
  geoJsonData?: FeatureCollection | null;
}

export function LeafletMap({
  projectLat, projectLng, baseLat, baseLng, municipio, baseEndereco, geoJsonData,
}: LeafletMapProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const line = L.polyline(
        [[baseLat, baseLng], [projectLat, projectLng]],
        { color: "hsl(var(--primary))", weight: 2, dashArray: "6 4", opacity: 0.6 }
      ).addTo(mapRef.current);
      markersRef.current.push(line);
    }

    if (!(geoJsonData && geoJsonData.features.length > 0)) {
      mapRef.current.setView([projectLat, projectLng], 8);
    }
  }, [projectLat, projectLng, baseLat, baseLng, municipio, baseEndereco, geoJsonData]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (geoLayerRef.current) {
      mapRef.current.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    if (geoJsonData && geoJsonData.features.length > 0) {
      geoLayerRef.current = L.geoJSON(geoJsonData as never, {
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

      const bounds = geoLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [geoJsonData]);

  return <div ref={containerRef} className="h-full w-full" />;
}

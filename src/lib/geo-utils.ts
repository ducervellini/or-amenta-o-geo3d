import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";
import shp from "shpjs";
import type { FeatureCollection, GeoJSON } from "geojson";

/**
 * Parse a geographic file (.kmz, .kml, .shp, .zip) into GeoJSON
 */
export async function parseGeoFile(file: File): Promise<FeatureCollection> {
  const ext = file.name.toLowerCase().split(".").pop();

  if (ext === "kml") {
    return parseKML(file);
  } else if (ext === "kmz") {
    return parseKMZ(file);
  } else if (ext === "zip" || ext === "shp") {
    return parseSHP(file);
  }

  throw new Error(`Formato não suportado: .${ext}`);
}

async function parseKML(file: File): Promise<FeatureCollection> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const geojson = kml(doc);
  return geojson as FeatureCollection;
}

async function parseKMZ(file: File): Promise<FeatureCollection> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // Find the .kml file inside the KMZ
  let kmlContent: string | null = null;
  for (const [name, entry] of Object.entries(zip.files)) {
    if (name.toLowerCase().endsWith(".kml") && !entry.dir) {
      kmlContent = await entry.async("string");
      break;
    }
  }

  if (!kmlContent) {
    throw new Error("Nenhum arquivo .kml encontrado dentro do .kmz");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlContent, "text/xml");
  const geojson = kml(doc);
  return geojson as FeatureCollection;
}

async function parseSHP(file: File): Promise<FeatureCollection> {
  const buffer = await file.arrayBuffer();
  const geojson = await shp(buffer);

  // shpjs can return a single FeatureCollection or an array
  if (Array.isArray(geojson)) {
    // Merge all feature collections
    const features = geojson.flatMap((fc: any) => fc.features || []);
    return { type: "FeatureCollection", features };
  }

  return geojson as FeatureCollection;
}

/**
 * Extract centroid from a GeoJSON FeatureCollection
 */
export function getGeoJSONCenter(geojson: FeatureCollection): { lat: number; lng: number } | null {
  const coords: [number, number][] = [];

  function extractCoords(geometry: any) {
    if (!geometry) return;
    switch (geometry.type) {
      case "Point":
        coords.push(geometry.coordinates);
        break;
      case "MultiPoint":
      case "LineString":
        coords.push(...geometry.coordinates);
        break;
      case "MultiLineString":
      case "Polygon":
        geometry.coordinates.forEach((ring: any) => coords.push(...ring));
        break;
      case "MultiPolygon":
        geometry.coordinates.forEach((poly: any) =>
          poly.forEach((ring: any) => coords.push(...ring))
        );
        break;
      case "GeometryCollection":
        geometry.geometries?.forEach(extractCoords);
        break;
    }
  }

  for (const feature of geojson.features) {
    extractCoords(feature.geometry);
  }

  if (coords.length === 0) return null;

  const sumLng = coords.reduce((s, c) => s + c[0], 0);
  const sumLat = coords.reduce((s, c) => s + c[1], 0);

  return {
    lat: sumLat / coords.length,
    lng: sumLng / coords.length,
  };
}

/**
 * Get bounding box from a GeoJSON FeatureCollection
 */
export function getGeoJSONBounds(geojson: FeatureCollection): L.LatLngBoundsExpression | null {
  const coords: [number, number][] = [];

  function extractCoords(geometry: any) {
    if (!geometry) return;
    switch (geometry.type) {
      case "Point":
        coords.push(geometry.coordinates);
        break;
      case "MultiPoint":
      case "LineString":
        coords.push(...geometry.coordinates);
        break;
      case "MultiLineString":
      case "Polygon":
        geometry.coordinates.forEach((ring: any) => coords.push(...ring));
        break;
      case "MultiPolygon":
        geometry.coordinates.forEach((poly: any) =>
          poly.forEach((ring: any) => coords.push(...ring))
        );
        break;
      case "GeometryCollection":
        geometry.geometries?.forEach(extractCoords);
        break;
    }
  }

  for (const feature of geojson.features) {
    extractCoords(feature.geometry);
  }

  if (coords.length === 0) return null;

  const lats = coords.map((c) => c[1]);
  const lngs = coords.map((c) => c[0]);

  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

/**
 * Sample points along a GeoJSON geometry for reverse geocoding
 * Returns unique points spread across the geometry
 */
export function samplePointsFromGeoJSON(
  geojson: FeatureCollection,
  maxPoints = 20
): { lat: number; lng: number }[] {
  const allCoords: [number, number][] = [];

  function extractCoords(geometry: any) {
    if (!geometry) return;
    switch (geometry.type) {
      case "Point":
        allCoords.push(geometry.coordinates);
        break;
      case "MultiPoint":
      case "LineString":
        allCoords.push(...geometry.coordinates);
        break;
      case "MultiLineString":
      case "Polygon":
        geometry.coordinates.forEach((ring: any) => allCoords.push(...ring));
        break;
      case "MultiPolygon":
        geometry.coordinates.forEach((poly: any) =>
          poly.forEach((ring: any) => allCoords.push(...ring))
        );
        break;
      case "GeometryCollection":
        geometry.geometries?.forEach(extractCoords);
        break;
    }
  }

  for (const feature of geojson.features) {
    extractCoords(feature.geometry);
  }

  if (allCoords.length === 0) return [];

  // Sample evenly spaced points
  const step = Math.max(1, Math.floor(allCoords.length / maxPoints));
  const sampled: { lat: number; lng: number }[] = [];

  for (let i = 0; i < allCoords.length && sampled.length < maxPoints; i += step) {
    sampled.push({ lat: allCoords[i][1], lng: allCoords[i][0] });
  }

  return sampled;
}

/**
 * Reverse geocode a point using Nominatim (OSM)
 * Rate limited: 1 request per second
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ municipio: string; uf: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,
      { headers: { "User-Agent": "MobilizacaoApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const municipio = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    const uf = addr.state || "";
    return municipio ? { municipio, uf } : null;
  } catch {
    return null;
  }
}

/**
 * Find municipalities that intersect with the geometry by sampling points
 * and reverse geocoding them
 */
export async function findMunicipiosFromGeoJSON(
  geojson: FeatureCollection,
  onProgress?: (current: number, total: number) => void
): Promise<{ nome: string; uf: string; distancia_km: number }[]> {
  const points = samplePointsFromGeoJSON(geojson, 15);
  const seen = new Set<string>();
  const municipios: { nome: string; uf: string; distancia_km: number }[] = [];

  const center = getGeoJSONCenter(geojson);

  for (let i = 0; i < points.length; i++) {
    onProgress?.(i + 1, points.length);

    const result = await reverseGeocode(points[i].lat, points[i].lng);
    if (result && result.municipio) {
      const key = `${result.municipio}-${result.uf}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        const dist = center
          ? haversine(center.lat, center.lng, points[i].lat, points[i].lng)
          : 0;
        municipios.push({
          nome: result.municipio,
          uf: result.uf,
          distancia_km: Math.round(dist * 10) / 10,
        });
      }
    }

    // Respect Nominatim rate limit: 1 req/sec
    if (i < points.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return municipios.sort((a, b) => a.distancia_km - b.distancia_km);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

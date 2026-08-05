/** Extrae ciudad/localidad del contexto de una feature de Mapbox Geocoding. */
export function extractCiudadFromMapboxFeature(feature: {
  context?: { id: string; text: string }[];
  place_type?: string[];
  text?: string;
}): string | null {
  const ctx = feature.context ?? [];
  const place = ctx.find((c) => c.id.startsWith("place."));
  if (place?.text) return place.text;
  const locality = ctx.find((c) => c.id.startsWith("locality."));
  if (locality?.text) return locality.text;
  if (feature.place_type?.includes("place") && feature.text) {
    return feature.text;
  }
  return null;
}

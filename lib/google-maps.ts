/** Google Maps 검색/장소 링크 */
export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

export function buildGoogleMapsPlaceUrl(name: string, address = ""): string {
  const parts = [name, address].filter(Boolean).join(" ");
  const query = parts.includes("판교") ? parts : `판교 ${parts}`;
  return buildGoogleMapsUrl(query);
}

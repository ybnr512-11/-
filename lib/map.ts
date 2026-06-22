const MAP_HOSTS = [
  "google.com",
  "google.co.kr",
  "maps.app.goo.gl",
  "goo.gl",
  "naver.com",
  "map.naver.com",
  "nmap.short.gy",
  "kakao.com",
  "kakaomap.com",
  "map.kakao.com",
  "openstreetmap.org",
];

export function isValidMapUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return MAP_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

export function extractCoords(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }
  return null;
}

export function getMapEmbedUrl(url: string): string | null {
  const coords = extractCoords(url);
  if (coords) {
    return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed`;
  }
  return null;
}

export function buildLocationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

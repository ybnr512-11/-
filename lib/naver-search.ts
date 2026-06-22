export interface NaverPlace {
  name: string;
  category: string;
  description: string;
  telephone: string;
  link: string;
  address: string;
  mapx: string;
  mapy: string;
  naverSearchQuery: string;
}

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, "").trim();
}

function isNaverMapLink(url: string) {
  return /map\.naver\.com|naver\.me|m\.place\.naver\.com|pcmap\.place\.naver\.com/i.test(url);
}

/** API link가 홈페이지인 경우가 많아 좌표·이름 기반 네이버 지도 URL 생성 */
export function buildNaverPlaceLink(place: {
  name: string;
  address: string;
  link?: string;
  mapx?: string;
  mapy?: string;
}): string {
  const rawLink = place.link?.trim() ?? "";
  if (rawLink && isNaverMapLink(rawLink)) {
    return rawLink.replace(/^http:/i, "https:");
  }

  if (place.mapx && place.mapy) {
    const lng = Number(place.mapx) / 1e7;
    const lat = Number(place.mapy) / 1e7;
    if (Number.isFinite(lng) && Number.isFinite(lat) && lng > 0 && lat > 0) {
      const label = encodeURIComponent(`${place.name} ${place.address}`.trim());
      return `https://map.naver.com/v5/search/${label}?c=${lng},${lat},17,0,0,0,dh`;
    }
  }

  const query = encodeURIComponent(`${place.name} ${place.address}`.trim());
  return `https://map.naver.com/v5/search/${query}`;
}

export function isNaverSearchConfigured() {
  return !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

export async function searchNaverPlaces(
  query: string,
  display = 5
): Promise<NaverPlace[] | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("sort", "comment");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("Naver search failed:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    items?: Array<{
      title: string;
      category: string;
      description: string;
      telephone: string;
      link: string;
      address: string;
      roadAddress: string;
      mapx: string;
      mapy: string;
    }>;
  };

  if (!data.items?.length) return [];

  return data.items.map((item) => {
    const name = stripHtml(item.title);
    const address = item.roadAddress || item.address;
    return {
      name,
      category: item.category.replace(/^.*?>/, "").trim(),
      description: stripHtml(item.description),
      telephone: item.telephone || "",
      link: item.link,
      address,
      mapx: item.mapx,
      mapy: item.mapy,
      naverSearchQuery: `${name} ${address}`.trim(),
    };
  });
}

export function buildNaverQuery(
  content: string,
  categoryLabel: string,
  keywords: string[]
) {
  const base = `판교 ${categoryLabel}`;
  const extra = keywords.slice(0, 2).join(" ");
  const fromContent = content.replace(/\s+/g, " ").slice(0, 30);
  return `${base} ${extra || fromContent}`.trim().slice(0, 80);
}

const PLACE_HINTS = [
  "맛집",
  "카페",
  "식당",
  "음식",
  "점심",
  "저녁",
  "주차",
  "병원",
  "약국",
  "추천",
  "어디",
  "위치",
  "근처",
  "회식",
  "술집",
];

export function isPlaceRelatedQuery(text: string) {
  return PLACE_HINTS.some((hint) => text.includes(hint));
}

export function buildPlaceQuery(userQuery: string) {
  return userQuery.includes("판교") ? userQuery : `판교 ${userQuery}`;
}

export async function getNaverContextBlock(userQuery: string): Promise<string | null> {
  if (!isPlaceRelatedQuery(userQuery)) return null;
  const places = await searchNaverPlaces(buildPlaceQuery(userQuery), 5);
  if (!places?.length) return null;

  return places
    .map((p, i) => {
      const mapLink = buildNaverPlaceLink(p);
      return `${i + 1}. ${p.name} | ${p.category} | ${p.address}${p.description ? ` | ${p.description}` : ""} | 지도: ${mapLink}`;
    })
    .join("\n");
}

export function naverPlacesToLinks(places: NaverPlace[]) {
  return places.map((p) => {
    const url = buildNaverPlaceLink(p);
    return {
      name: p.name,
      address: p.address,
      category: p.category,
      mapUrl: url,
      placeUrl: url,
    };
  });
}

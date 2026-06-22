export interface NaverPlace {
  name: string;
  category: string;
  description: string;
  telephone: string;
  link: string;
  address: string;
  naverSearchQuery: string;
}

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, "").trim();
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
    }>;
  };

  if (!data.items?.length) return [];

  return data.items.map((item) => {
    const name = stripHtml(item.title);
    return {
      name,
      category: item.category.replace(/^.*?>/, "").trim(),
      description: stripHtml(item.description),
      telephone: item.telephone || "",
      link: item.link,
      address: item.roadAddress || item.address,
      naverSearchQuery: name,
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

export async function getNaverContextBlock(userQuery: string): Promise<string | null> {
  if (!isPlaceRelatedQuery(userQuery)) return null;
  const query = userQuery.includes("판교") ? userQuery : `판교 ${userQuery}`;
  const places = await searchNaverPlaces(query, 5);
  if (!places?.length) return null;

  return places
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} | ${p.category} | ${p.address}${p.description ? ` | ${p.description}` : ""}${p.telephone ? ` | ${p.telephone}` : ""} | ${p.link}`
    )
    .join("\n");
}

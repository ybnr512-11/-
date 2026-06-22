export interface KeywordCategory {
  id: string;
  label: string;
  keywords: string[];
  emoji: string;
}

export const KEYWORD_CATEGORIES: KeywordCategory[] = [
  {
    id: "restaurant",
    label: "맛집",
    emoji: "🍽️",
    keywords: ["맛집", "음식", "식당", "점심", "저녁", "밥", "먹", "레스토랑", "맛있", "메뉴", "술집", "회식"],
  },
  {
    id: "cafe",
    label: "카페",
    emoji: "☕",
    keywords: ["카페", "커피", "디저트", "브런치", "베이커리", "케이크"],
  },
  {
    id: "traffic",
    label: "교통·주차",
    emoji: "🚗",
    keywords: ["주차", "교통", "버스", "지하철", "판교역", "셔틀", "막힘", "출퇴근"],
  },
  {
    id: "medical",
    label: "의료",
    emoji: "🏥",
    keywords: ["병원", "약국", "의료", "진료", "치과", "한의원"],
  },
  {
    id: "family",
    label: "육아·교육",
    emoji: "👶",
    keywords: ["학원", "육아", "놀이터", "어린이", "유치원", "키즈"],
  },
  {
    id: "realestate",
    label: "부동산",
    emoji: "🏠",
    keywords: ["부동산", "전세", "월세", "매물", "아파트", "오피스텔", "임대"],
  },
  {
    id: "event",
    label: "행사·모임",
    emoji: "🎉",
    keywords: ["행사", "축제", "모임", "밋업", "공연", "전시"],
  },
];

export function detectCategory(content: string) {
  const lower = content.toLowerCase();
  let best: { category: KeywordCategory; matched: string[]; score: number } | null = null;

  for (const category of KEYWORD_CATEGORIES) {
    const matched = category.keywords.filter((kw) => lower.includes(kw));
    if (matched.length > 0 && (!best || matched.length > best.score)) {
      best = { category, matched, score: matched.length };
    }
  }

  if (!best) return null;
  return {
    id: best.category.id,
    label: best.category.label,
    emoji: best.category.emoji,
    keywords: best.matched,
  };
}

export function buildNaverSearchUrl(query: string) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
}

export function buildNaverPlaceSearchUrl(query: string) {
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

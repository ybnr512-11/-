export interface KeywordCategory {
  id: string;
  label: string;
  keywords: string[];
  emoji: string;
}

export interface DetectedCategory {
  id: string;
  label: string;
  emoji: string;
  keywords: string[];
}

export const KEYWORD_CATEGORIES: KeywordCategory[] = [
  {
    id: "restaurant",
    label: "맛집",
    emoji: "🍽️",
    keywords: [
      "맛집",
      "음식",
      "식당",
      "점심",
      "저녁",
      "밥",
      "레스토랑",
      "맛있",
      "메뉴",
      "술집",
      "회식",
      "먹고",
      "먹을",
      "먹어",
      "먹으",
      "먹는",
    ],
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
    keywords: ["주차", "주차장", "교통", "버스", "지하철", "판교역", "셔틀", "막힘", "출퇴근"],
  },
  {
    id: "medical",
    label: "의료",
    emoji: "🏥",
    keywords: ["병원", "약국", "의료", "진료", "치과", "한의원", "피부과", "정형외과"],
  },
  {
    id: "family",
    label: "육아·교육",
    emoji: "👶",
    keywords: ["학원", "육아", "놀이터", "어린이", "유치원", "키즈", "돌봄"],
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
  {
    id: "fitness",
    label: "운동·헬스",
    emoji: "💪",
    keywords: ["헬스", "피트니스", "요가", "필라테스", "수영", "골프", "운동"],
  },
  {
    id: "beauty",
    label: "미용",
    emoji: "💇",
    keywords: ["미용실", "헤어", "네일", "피부관리", "왁싱"],
  },
];

const PLACE_SEEKING_HINTS = [
  "추천",
  "어디",
  "근처",
  "알려",
  "찾",
  "궁금",
  "장소",
  "가볼",
  "해볼",
  "있나",
  "있을까",
  "아시",
  "아는",
  "알고",
  "위치",
];

function matchesKeyword(text: string, keyword: string) {
  if (keyword.length <= 1) return false;
  return text.includes(keyword);
}

export function detectCategory(content: string): DetectedCategory | null {
  const text = content.trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  let best: { category: KeywordCategory; matched: string[]; score: number } | null = null;

  for (const category of KEYWORD_CATEGORIES) {
    const matched = category.keywords.filter((kw) => matchesKeyword(lower, kw));
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

export function hasPlaceSeekingIntent(content: string) {
  const text = content.trim().toLowerCase();
  if (!text) return false;
  return PLACE_SEEKING_HINTS.some((hint) => text.includes(hint));
}

/** 장소 추천 버튼을 보여줄 게시글인지 */
export function shouldShowRecommendPanel(content: string) {
  const text = content.trim();
  if (!text) return false;
  return detectCategory(text) !== null || hasPlaceSeekingIntent(text);
}

export function getRecommendButtonLabel(content: string) {
  const detected = detectCategory(content);
  if (detected) return `${detected.label} 추천`;
  if (hasPlaceSeekingIntent(content)) return "관련 장소 추천";
  return "AI 추천";
}

export function getRecommendButtonEmoji(content: string) {
  return detectCategory(content)?.emoji ?? "📍";
}

export function buildRecommendSearchQuery(content: string, detected: DetectedCategory | null) {
  const text = content.replace(/\s+/g, " ").trim();
  if (detected) {
    const topic = detected.keywords.join(" ");
    return `판교 ${detected.label} ${topic}`.trim().slice(0, 80);
  }
  return `판교 ${text}`.slice(0, 80);
}

export function buildNaverSearchUrl(query: string) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
}

export function buildNaverPlaceSearchUrl(query: string) {
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

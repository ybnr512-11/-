export function getRecommendSourceLabel(source?: string) {
  if (source === "naver") return "네이버 지역 검색 (리뷰순)";
  if (source === "google") return "Google 검색";
  return "검색 기반";
}

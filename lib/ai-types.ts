export interface RecommendItem {
  name: string;
  area: string;
  reason: string;
  highlights: string;
  rankHint: string;
  naverSearchQuery: string;
  naverPlaceUrl?: string;
  naverSearchUrl?: string;
  naverMapUrl?: string;
}

export interface RecommendResult {
  category: string;
  keywords: string[];
  summary: string;
  source?: "naver" | "google";
  items: RecommendItem[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

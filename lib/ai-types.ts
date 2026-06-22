export interface RecommendItem {
  name: string;
  area: string;
  reason: string;
  highlights: string;
  rankHint: string;
  naverSearchQuery: string;
}

export interface RecommendResult {
  category: string;
  keywords: string[];
  summary: string;
  items: RecommendItem[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

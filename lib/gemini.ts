import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, RecommendResult } from "@/lib/ai-types";
import { buildNaverPlaceSearchUrl, buildNaverSearchUrl } from "@/lib/keywords";

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

const ASSISTANT_PERSONA = `당신은 '판교 대신 전해드립니다' 커뮤니티 AI 도우미입니다.
판교·분당·판교역·백현동·판교테크노밸리 지역의 맛집, 카페, 교통, 주차, 부동산, 생활 정보를 친절하게 안내합니다.
맛집·카페 추천 시 네이버·구글 검색에서 평점·리뷰가 좋고 인기 있는 곳 위주로 추천하세요.
항상 한국어로 답하고, 실제 방문 전 네이버 지도에서 최신 영업시간·리뷰를 확인하라고 안내하세요.
모르는 정보는 지어내지 말고 솔직히 말하세요.`;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }
  return new GoogleGenerativeAI(apiKey);
}

function toApiMessages(messages: ChatMessage[]): ChatMessage[] {
  const filtered = messages.filter(
    (m, i) => !(i === 0 && m.role === "assistant" && messages.length > 1)
  );
  if (filtered.length === 0 || filtered[0]?.role === "assistant") {
    return filtered.filter((m) => m.role === "user" || m.role === "assistant");
  }
  return filtered;
}

function buildHistory(messages: ChatMessage[]) {
  const apiMessages = toApiMessages(messages);
  const prior = apiMessages.slice(0, -1);
  let history = prior.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  while (history.length > 0 && history[0].role === "model") {
    history = history.slice(1);
  }

  return { history, last: apiMessages[apiMessages.length - 1] };
}

function extractText(response: { text: () => string }) {
  try {
    return response.text();
  } catch {
    throw new Error("AI_EMPTY_RESPONSE");
  }
}

async function withModelFallback<T>(run: (modelName: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const modelName of MODELS) {
    try {
      return await run(modelName);
    } catch (err) {
      lastError = err;
      console.error(`Gemini model ${modelName} failed:`, err);
    }
  }
  throw lastError;
}

export async function chatWithGemini(
  messages: ChatMessage[],
  nickname?: string
): Promise<string> {
  const { history, last } = buildHistory(messages);
  if (!last || last.role !== "user") {
    throw new Error("INVALID_USER_MESSAGE");
  }

  return withModelFallback(async (modelName) => {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: ASSISTANT_PERSONA,
    });

    const prefix = nickname ? `[${nickname}] ` : "";
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(`${prefix}${last.content}`);
    return extractText(result.response);
  });
}

export async function getRecommendations(
  content: string,
  categoryLabel: string,
  matchedKeywords: string[]
): Promise<RecommendResult> {
  const prompt = `다음 게시글 내용을 분석해 판교 지역 ${categoryLabel} 추천을 JSON으로 반환하세요.

게시글: """${content}"""
감지된 키워드: ${matchedKeywords.join(", ")}

아래 JSON 스키마를 정확히 따르세요:
{
  "category": "${categoryLabel}",
  "keywords": ["감지된 키워드들"],
  "summary": "추천 요약 1~2문장",
  "items": [
    {
      "name": "업체명",
      "area": "판교역/백현동/테크노밸리 등 구체적 위치",
      "reason": "추천 이유 (검색·리뷰 인기 근거 포함)",
      "highlights": "대표 메뉴나 특징",
      "rankHint": "네이버/검색 인기도 설명 (예: 네이버 리뷰 4.5+)",
      "naverSearchQuery": "네이버 검색용 키워드 (예: 판교역 ○○식당)"
    }
  ]
}

규칙:
- items는 3~5개
- 실제 판교·분당 지역에 있을 법한 곳 위주
- 맛집이면 네이버 맛집 검색 순위·리뷰가 좋은 곳 스타일로 추천
- JSON만 출력`;

  return withModelFallback(async (modelName) => {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: ASSISTANT_PERSONA,
    });

    const result = await model.generateContent(prompt);
    const text = extractText(result.response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text) as RecommendResult;

    parsed.items = (parsed.items || []).map((item) => ({
      ...item,
      naverSearchQuery: item.naverSearchQuery || `판교 ${item.name}`,
    }));

    return parsed;
  });
}

export function enrichRecommendLinks(result: RecommendResult) {
  return {
    ...result,
    items: result.items.map((item) => ({
      ...item,
      naverSearchUrl: buildNaverSearchUrl(item.naverSearchQuery),
      naverMapUrl: buildNaverPlaceSearchUrl(item.naverSearchQuery),
    })),
  };
}

export type EnrichedRecommendResult = ReturnType<typeof enrichRecommendLinks>;

export function getGeminiErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "GEMINI_API_KEY_MISSING") {
      return "GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요.";
    }
    if (err.message === "INVALID_USER_MESSAGE") {
      return "유효한 메시지가 필요합니다.";
    }
    if (err.message === "AI_EMPTY_RESPONSE") {
      return "AI가 응답을 생성하지 못했습니다. 다시 시도해주세요.";
    }
    if (err.message.includes("API key")) {
      return "API Key가 올바르지 않습니다. Vercel 환경 변수를 확인해주세요.";
    }
  }
  return "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
}

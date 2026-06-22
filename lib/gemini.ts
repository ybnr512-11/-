import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, PlaceLink, RecommendResult } from "@/lib/ai-types";
import { buildGoogleMapsPlaceUrl } from "@/lib/google-maps";
import { buildNaverSearchUrl } from "@/lib/keywords";
import {
  buildNaverQuery,
  isPlaceRelatedQuery,
  searchNaverPlaces,
} from "@/lib/naver-search";

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

const FACT_RULES = `반드시 검색 결과·제공된 데이터에 있는 정보만 사용하세요.
검색 결과에 없는 업체 이름, 주소, 메뉴, 평점을 지어내지 마세요.
확실하지 않으면 "검색 결과에서 확인되지 않습니다"라고 답하세요.`;

const ASSISTANT_PERSONA = `당신은 '판교 대신 전해드립니다' 커뮤니티 AI 도우미입니다.
판교·분당·판교역·백현동·판교테크노밸리 지역 정보를 안내합니다.
${FACT_RULES}
항상 한국어로 답하고, 방문 전 Google 지도에서 최신 영업시간·리뷰 확인을 안내하세요.`;

const GOOGLE_SEARCH_TOOLS = [{ googleSearch: {} }] as never;

interface GooglePlaceItem {
  name: string;
  address: string;
  category?: string;
  reason: string;
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");
  return new GoogleGenerativeAI(apiKey);
}

function toApiMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(
    (m, i) => !(i === 0 && m.role === "assistant" && messages.length > 1)
  );
}

function buildGeminiContents(messages: ChatMessage[]) {
  const apiMessages = toApiMessages(messages);
  let contents = apiMessages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  while (contents.length > 0 && contents[0].role === "model") {
    contents = contents.slice(1);
  }
  return contents;
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

async function generateWithGoogleSearch(
  modelName: string,
  systemInstruction: string,
  contents: Array<{ role: "user" | "model"; parts: { text: string }[] }>
) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    tools: GOOGLE_SEARCH_TOOLS,
  });
  const result = await model.generateContent({ contents });
  return extractText(result.response);
}

function parsePlacesJson(text: string): GooglePlaceItem[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? text) as {
    places?: GooglePlaceItem[];
  };
  return (parsed.places ?? []).filter((p) => p.name?.trim() && p.address?.trim());
}

function googlePlacesToLinks(places: GooglePlaceItem[]): PlaceLink[] {
  return places.map((p) => {
    const url = buildGoogleMapsPlaceUrl(p.name, p.address);
    return {
      name: p.name,
      address: p.address,
      category: p.category,
      mapUrl: url,
      placeUrl: url,
    };
  });
}

function buildGooglePlaceReply(places: GooglePlaceItem[]) {
  let reply = `Google 검색 기준 ${places.length}곳을 추천드립니다.\n\n`;
  places.forEach((p, i) => {
    reply += `${i + 1}. ${p.name}\n`;
    reply += `   📍 ${p.address}\n`;
    reply += `   ${p.reason}\n\n`;
  });
  reply += `아래 🗺️ 버튼을 누르면 Google 지도에서 위치를 확인할 수 있습니다.`;
  return reply;
}

async function getGooglePlaceRecommendations(
  userQuery: string,
  nickname?: string
): Promise<{ places: GooglePlaceItem[]; sources: string[] }> {
  const query = userQuery.includes("판교") ? userQuery : `판교 ${userQuery}`;
  const prefix = nickname ? `[${nickname}] ` : "";

  const prompt = `${prefix}질문: ${query}

Google 검색으로 판교·분당 인근 실제 업체 3~5곳을 찾아 JSON만 출력하세요.
업체명·주소는 Google 검색에서 확인된 것만 사용하세요.

{"places":[{"name":"업체명","address":"도로명 또는 지번 주소","category":"분류","reason":"한 줄 추천 이유"}]}`;

  const text = await withModelFallback((modelName) =>
    generateWithGoogleSearch(
      modelName,
      `${ASSISTANT_PERSONA}\nGoogle 검색으로 실제 존재하는 업체만 JSON으로 반환하세요.`,
      [{ role: "user", parts: [{ text: prompt }] }]
    )
  );

  return { places: parsePlacesJson(text), sources: ["Google 검색"] };
}

function buildRecommendFromNaver(
  places: NonNullable<Awaited<ReturnType<typeof searchNaverPlaces>>>,
  categoryLabel: string,
  keywords: string[]
): RecommendResult {
  return {
    category: categoryLabel,
    keywords,
    source: "naver",
    summary: `네이버 지역 검색(리뷰 많은 순) 결과 ${places.length}곳입니다. Google 지도 링크로 위치를 확인해주세요.`,
    items: places.map((p) => ({
      name: p.name,
      area: p.address,
      reason: p.description || `${p.category} · 네이버 지역 검색 결과`,
      highlights: p.category,
      rankHint: "네이버 지역 검색 · 리뷰순",
      naverSearchQuery: p.naverSearchQuery,
    })),
  };
}

export async function chatWithGemini(
  messages: ChatMessage[],
  nickname?: string
): Promise<{ reply: string; sources: string[]; placeLinks: PlaceLink[] }> {
  const apiMessages = toApiMessages(messages);
  const last = apiMessages[apiMessages.length - 1];
  if (!last || last.role !== "user") throw new Error("INVALID_USER_MESSAGE");

  if (isPlaceRelatedQuery(last.content)) {
    const { places, sources } = await getGooglePlaceRecommendations(last.content, nickname);
    if (places.length > 0) {
      return {
        reply: buildGooglePlaceReply(places),
        sources,
        placeLinks: googlePlacesToLinks(places),
      };
    }
    return {
      reply: "판교 지역 검색 결과를 찾지 못했습니다. 질문을 조금 더 구체적으로 바꿔보세요.",
      sources: ["Google 검색"],
      placeLinks: [],
    };
  }

  const prefix = nickname ? `[${nickname}] ` : "";
  const userText = `${prefix}${last.content}\n\n(지시: Google 검색 결과만 사용. URL·링크는 작성하지 마세요. 말미에 "📍 출처: Google 검색" 표시)`;

  const contents = buildGeminiContents(apiMessages.slice(0, -1));
  contents.push({ role: "user", parts: [{ text: userText }] });

  const reply = await withModelFallback((modelName) =>
    generateWithGoogleSearch(
      modelName,
      `${ASSISTANT_PERSONA}\nGoogle 검색 도구로 최신 정보를 확인한 뒤 답변하세요.`,
      contents
    )
  );

  return { reply, sources: ["Google 검색"], placeLinks: [] };
}

export async function getRecommendations(
  content: string,
  categoryLabel: string,
  matchedKeywords: string[]
): Promise<RecommendResult> {
  const naverQuery = buildNaverQuery(content, categoryLabel, matchedKeywords);
  const naverPlaces = await searchNaverPlaces(naverQuery, 5);

  if (naverPlaces && naverPlaces.length > 0) {
    return buildRecommendFromNaver(naverPlaces, categoryLabel, matchedKeywords);
  }

  const prompt = `판교 지역 ${categoryLabel} 추천을 Google 검색으로 조사한 뒤 JSON으로 반환하세요.
${FACT_RULES}

게시글: """${content}"""
키워드: ${matchedKeywords.join(", ")}

JSON 스키마:
{
  "category": "${categoryLabel}",
  "keywords": ${JSON.stringify(matchedKeywords)},
  "source": "google",
  "summary": "Google 검색 기반 요약",
  "items": [{
    "name": "업체명",
    "area": "주소",
    "reason": "Google 검색에서 확인된 근거",
    "highlights": "대표 특징",
    "rankHint": "Google 검색 기준",
    "naverSearchQuery": "검색어"
  }]
}

items 3~5개, Google 검색으로 확인된 곳만, JSON만 출력`;

  return withModelFallback(async (modelName) => {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: ASSISTANT_PERSONA,
      tools: GOOGLE_SEARCH_TOOLS,
    });

    const result = await model.generateContent(prompt);
    const text = extractText(result.response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text) as RecommendResult;
    parsed.source = "google";
    parsed.summary =
      parsed.summary || "Google 검색 기반 추천입니다. Google 지도에서 최신 정보를 확인해주세요.";
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
    items: result.items.map((item) => {
      const googleMapUrl = buildGoogleMapsPlaceUrl(item.name, item.area);
      return {
        ...item,
        googleMapUrl,
        naverSearchUrl: buildNaverSearchUrl(item.naverSearchQuery),
        naverMapUrl: googleMapUrl,
      };
    }),
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

export function getSourceLabel(source?: string) {
  if (source === "naver") return "네이버 지역 검색 (리뷰순)";
  if (source === "google") return "Google 검색";
  return "검색 기반";
}

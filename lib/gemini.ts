import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, PlaceLink, RecommendResult } from "@/lib/ai-types";
import { buildNaverPlaceSearchUrl, buildNaverSearchUrl } from "@/lib/keywords";
import {
  buildNaverQuery,
  getNaverContextBlock,
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
항상 한국어로 답하고, 방문 전 네이버 지도에서 최신 영업시간·리뷰 확인을 안내하세요.`;

const GOOGLE_SEARCH_TOOLS = [{ googleSearch: {} }] as never;

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

function buildRecommendFromNaver(
  places: NonNullable<Awaited<ReturnType<typeof searchNaverPlaces>>>,
  categoryLabel: string,
  keywords: string[]
): RecommendResult {
  return {
    category: categoryLabel,
    keywords,
    source: "naver",
    summary: `네이버 지역 검색(리뷰 많은 순) 결과 ${places.length}곳입니다. 아래는 실제 검색 결과이며, 방문 전 네이버 지도에서 최신 정보를 확인해주세요.`,
    items: places.map((p) => ({
      name: p.name,
      area: p.address,
      reason: p.description || `${p.category} · 네이버 지역 검색 결과`,
      highlights: p.category,
      rankHint: "네이버 지역 검색 · 리뷰순",
      naverSearchQuery: p.naverSearchQuery,
      naverPlaceUrl: p.link,
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

  const sources: string[] = [];
  const placeLinks: PlaceLink[] = [];

  const naverBlock = await getNaverContextBlock(last.content);
  if (naverBlock) sources.push("네이버 지역 검색");

  if (isPlaceRelatedQuery(last.content)) {
    const query = last.content.includes("판교") ? last.content : `판교 ${last.content}`;
    const places = await searchNaverPlaces(query, 5);
    if (places?.length) {
      for (const p of places) {
        placeLinks.push({
          name: p.name,
          address: p.address,
          mapUrl: buildNaverPlaceSearchUrl(p.naverSearchQuery),
          placeUrl: p.link,
        });
      }
    }
  }

  const prefix = nickname ? `[${nickname}] ` : "";
  let userText = `${prefix}${last.content}`;
  if (naverBlock) {
    userText += `\n\n[네이버 지역 검색 결과 - 아래 업체만 추천 가능]\n${naverBlock}`;
  }

  userText += `\n\n(지시: Google 검색과 위 데이터를 활용해 팩트 기반으로 답변. 추천하는 각 장소는 반드시 [업체명](네이버링크) 마크다운 형식으로 네이버 지도/플레이스 링크를 포함. 말미에 "📍 출처: ..." 로 표시)`;

  const contents = buildGeminiContents(apiMessages.slice(0, -1));
  contents.push({ role: "user", parts: [{ text: userText }] });

  let reply = await withModelFallback((modelName) =>
    generateWithGoogleSearch(
      modelName,
      `${ASSISTANT_PERSONA}\nGoogle 검색 도구로 최신 정보를 확인한 뒤 답변하세요. 장소 추천 시 각 업체명을 [이름](링크) 형식의 클릭 가능한 마크다운 링크로 작성하세요.`,
      contents
    )
  );

  if (placeLinks.length > 0 && !reply.includes("map.naver") && !reply.includes("place.naver")) {
    reply += "\n\n🗺️ **네이버 지도 바로가기**\n";
    reply += placeLinks
      .map((p) => `- [${p.name}](${p.placeUrl || p.mapUrl}) · ${p.address}`)
      .join("\n");
  }

  sources.push("Google 검색");
  return { reply, sources: Array.from(new Set(sources)), placeLinks };
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
    "naverSearchQuery": "네이버 검색어"
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
      parsed.summary || "Google 검색 기반 추천입니다. 방문 전 네이버 지도에서 최신 정보를 확인해주세요.";
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
      naverMapUrl: item.naverPlaceUrl || buildNaverPlaceSearchUrl(item.naverSearchQuery),
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

export function getSourceLabel(source?: string) {
  if (source === "naver") return "네이버 지역 검색 (리뷰순)";
  if (source === "google") return "Google 검색";
  return "검색 기반";
}

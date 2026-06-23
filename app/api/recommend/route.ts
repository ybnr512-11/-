import { NextRequest, NextResponse } from "next/server";
import {
  buildRecommendSearchQuery,
  detectCategory,
  shouldShowRecommendPanel,
} from "@/lib/keywords";
import { enrichRecommendLinks, getRecommendations, getGeminiErrorMessage } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = body.content?.trim();

    if (!content || content.length > 2000) {
      return NextResponse.json({ error: "게시글 내용이 필요합니다" }, { status: 400 });
    }

    if (!shouldShowRecommendPanel(content)) {
      return NextResponse.json(
        { error: "장소·추천과 관련된 내용이 있는 게시글에서만 AI 추천을 사용할 수 있습니다" },
        { status: 400 }
      );
    }

    const detected = detectCategory(content);
    const categoryLabel = detected?.label ?? "판교";
    const keywords = detected?.keywords ?? [];
    const searchQuery = buildRecommendSearchQuery(content, detected);

    const result = await getRecommendations(content, categoryLabel, keywords, searchQuery);
    return NextResponse.json(enrichRecommendLinks(result));
  } catch (err) {
    console.error("Recommend error:", err);
    const message = getGeminiErrorMessage(err);
    const status = err instanceof Error && err.message === "GEMINI_API_KEY_MISSING" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

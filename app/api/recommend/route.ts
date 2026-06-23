import { NextRequest, NextResponse } from "next/server";
import { detectCategoryOrDefault } from "@/lib/keywords";
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

    const detected = detectCategoryOrDefault(content);
    const result = await getRecommendations(content, detected.label, detected.keywords);
    return NextResponse.json(enrichRecommendLinks(result));
  } catch (err) {
    console.error("Recommend error:", err);
    const message = getGeminiErrorMessage(err);
    const status = err instanceof Error && err.message === "GEMINI_API_KEY_MISSING" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

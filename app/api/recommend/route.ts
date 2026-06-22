import { NextRequest, NextResponse } from "next/server";
import { detectCategory } from "@/lib/keywords";
import { enrichRecommendLinks, getRecommendations } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = body.content?.trim();

    if (!content || content.length > 2000) {
      return NextResponse.json({ error: "게시글 내용이 필요합니다" }, { status: 400 });
    }

    const detected = detectCategory(content);
    if (!detected) {
      return NextResponse.json(
        { error: "추천 가능한 키워드가 감지되지 않았습니다" },
        { status: 400 }
      );
    }

    const result = await getRecommendations(content, detected.label, detected.keywords);
    return NextResponse.json(enrichRecommendLinks(result));
  } catch (err) {
    if (err instanceof Error && err.message === "GEMINI_API_KEY_MISSING") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요." },
        { status: 503 }
      );
    }
    console.error("Recommend error:", err);
    return NextResponse.json({ error: "AI 추천 생성에 실패했습니다" }, { status: 500 });
  }
}

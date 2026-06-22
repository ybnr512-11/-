import { NextRequest, NextResponse } from "next/server";
import { chatWithGemini, getGeminiErrorMessage } from "@/lib/gemini";
import type { ChatMessage } from "@/lib/ai-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = body.messages as ChatMessage[];
    const nickname = body.nickname?.trim();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "메시지를 입력해주세요" }, { status: 400 });
    }

    const last = messages[messages.length - 1];
    if (last.role !== "user" || !last.content?.trim()) {
      return NextResponse.json({ error: "유효한 메시지가 필요합니다" }, { status: 400 });
    }
    if (last.content.length > 1000) {
      return NextResponse.json({ error: "메시지는 1000자 이하입니다" }, { status: 400 });
    }

    const { reply, sources } = await chatWithGemini(messages, nickname);
    return NextResponse.json({ reply, sources });
  } catch (err) {
    console.error("Chatbot error:", err);
    const message = getGeminiErrorMessage(err);
    const status = err instanceof Error && err.message === "GEMINI_API_KEY_MISSING" ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createChatMessage, getChatMessages } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const messages = getChatMessages(100);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nickname = body.nickname?.trim();
    const content = body.content?.trim();

    if (!nickname || nickname.length > 20) {
      return NextResponse.json({ error: "닉네임을 확인해주세요" }, { status: 400 });
    }
    if (!content || content.length > 500) {
      return NextResponse.json({ error: "메시지를 입력해주세요 (최대 500자)" }, { status: 400 });
    }

    const message = createChatMessage(uuidv4(), nickname, content);
    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: "메시지 전송에 실패했습니다" }, { status: 500 });
  }
}

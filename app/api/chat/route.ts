import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createChatMessage, getChatMessages } from "@/lib/db";
import { saveUploadedImage } from "@/lib/upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const messages = getChatMessages(100);
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const nickname = (formData.get("nickname") as string)?.trim();
      const content = ((formData.get("content") as string) || "").trim();
      const image = formData.get("image") as File | null;

      if (!nickname || nickname.length > 20) {
        return NextResponse.json({ error: "닉네임을 확인해주세요" }, { status: 400 });
      }
      if (content.length > 500) {
        return NextResponse.json({ error: "메시지는 최대 500자입니다" }, { status: 400 });
      }

      let imageUrl: string | null = null;
      if (image && image.size > 0) {
        try {
          imageUrl = await saveUploadedImage(image);
        } catch (err) {
          if (err instanceof Error && err.message === "IMAGE_TOO_LARGE") {
            return NextResponse.json({ error: "이미지는 5MB 이하만 가능합니다" }, { status: 400 });
          }
          throw err;
        }
      }

      if (!content && !imageUrl) {
        return NextResponse.json({ error: "메시지 또는 이미지를 입력해주세요" }, { status: 400 });
      }

      const message = createChatMessage(uuidv4(), nickname, content, imageUrl);
      return NextResponse.json(message, { status: 201 });
    }

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

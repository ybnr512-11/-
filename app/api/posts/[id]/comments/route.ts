import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createComment, getComments } from "@/lib/db";
import { isValidMapUrl } from "@/lib/map";
import { saveUploadedImage } from "@/lib/upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const comments = getComments(params.id);
  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const nickname = (formData.get("nickname") as string)?.trim();
    const content = (formData.get("content") as string)?.trim() || "";
    const image = formData.get("image") as File | null;
    const mapUrl = (formData.get("map_url") as string)?.trim() || null;

    if (!nickname || nickname.length > 20) {
      return NextResponse.json({ error: "닉네임을 확인해주세요" }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: "댓글은 최대 500자까지 가능합니다" }, { status: 400 });
    }
    if (!content && !(image && image.size > 0) && !mapUrl) {
      return NextResponse.json(
        { error: "내용, 사진, 지도 중 하나 이상을 입력해주세요" },
        { status: 400 }
      );
    }
    if (mapUrl && !isValidMapUrl(mapUrl)) {
      return NextResponse.json(
        { error: "지원하지 않는 지도 URL입니다 (Google, Naver, Kakao 지도)" },
        { status: 400 }
      );
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

    const comment = createComment(
      uuidv4(),
      params.id,
      nickname,
      content,
      imageUrl,
      mapUrl
    );
    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "댓글 작성에 실패했습니다" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createPost, getPosts } from "@/lib/db";
import { saveUploadedImage } from "@/lib/upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const posts = getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const nickname = (formData.get("nickname") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();
    const image = formData.get("image") as File | null;

    if (!nickname || nickname.length > 20) {
      return NextResponse.json({ error: "닉네임을 확인해주세요 (1~20자)" }, { status: 400 });
    }
    if (!content || content.length > 1000) {
      return NextResponse.json({ error: "내용을 입력해주세요 (최대 1000자)" }, { status: 400 });
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

    const post = createPost(uuidv4(), nickname, content, imageUrl);
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "게시글 작성에 실패했습니다" }, { status: 500 });
  }
}

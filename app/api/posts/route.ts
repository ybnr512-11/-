import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { createPost, getPosts, uploadsDir } from "@/lib/db";

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
      if (image.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "이미지는 5MB 이하만 가능합니다" }, { status: 400 });
      }
      const ext = path.extname(image.name) || ".jpg";
      const filename = `${uuidv4()}${ext}`;
      const buffer = Buffer.from(await image.arrayBuffer());
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      imageUrl = `/uploads/${filename}`;
    }

    const post = createPost(uuidv4(), nickname, content, imageUrl);
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "게시글 작성에 실패했습니다" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { deletePost, getPost, updatePost } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verifyOwner(postNickname: string, requestNickname: string) {
  return postNickname === requestNickname?.trim();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = getPost(params.id);
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
    }

    const body = await request.json();
    const nickname = body.nickname?.trim();
    const content = body.content?.trim();

    if (!verifyOwner(post.nickname, nickname)) {
      return NextResponse.json({ error: "본인 게시글만 수정할 수 있습니다" }, { status: 403 });
    }
    if (!content || content.length > 1000) {
      return NextResponse.json({ error: "내용을 입력해주세요 (최대 1000자)" }, { status: 400 });
    }

    const updated = updatePost(params.id, content);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "게시글 수정에 실패했습니다" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = getPost(params.id);
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
    }

    const body = await request.json();
    const nickname = body.nickname?.trim();

    if (!verifyOwner(post.nickname, nickname)) {
      return NextResponse.json({ error: "본인 게시글만 삭제할 수 있습니다" }, { status: 403 });
    }

    deletePost(params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "게시글 삭제에 실패했습니다" }, { status: 500 });
  }
}

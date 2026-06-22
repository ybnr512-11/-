import { NextRequest, NextResponse } from "next/server";
import { deleteComment, getComment, updateComment } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verifyOwner(commentNickname: string, requestNickname: string) {
  return commentNickname === requestNickname?.trim();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const comment = getComment(params.commentId);
    if (!comment || comment.post_id !== params.id) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }

    const body = await request.json();
    const nickname = body.nickname?.trim();
    const content = body.content?.trim();

    if (!verifyOwner(comment.nickname, nickname)) {
      return NextResponse.json({ error: "본인 댓글만 수정할 수 있습니다" }, { status: 403 });
    }
    if (!content || content.length > 500) {
      return NextResponse.json({ error: "댓글 내용을 입력해주세요 (최대 500자)" }, { status: 400 });
    }

    const updated = updateComment(params.commentId, content);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "댓글 수정에 실패했습니다" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const comment = getComment(params.commentId);
    if (!comment || comment.post_id !== params.id) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }

    const body = await request.json();
    const nickname = body.nickname?.trim();

    if (!verifyOwner(comment.nickname, nickname)) {
      return NextResponse.json({ error: "본인 댓글만 삭제할 수 있습니다" }, { status: 403 });
    }

    deleteComment(params.commentId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "댓글 삭제에 실패했습니다" }, { status: 500 });
  }
}

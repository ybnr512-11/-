"use client";

import { useState } from "react";
import { formatTime } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/image-url";
import { Socket } from "socket.io-client";
import type { FlatComment } from "@/lib/comments";
import CommentThread from "./CommentThread";
import RecommendationPanel from "./RecommendationPanel";

interface Post {
  id: string;
  nickname: string;
  content: string;
  image_url: string | null;
  created_at: number;
  comment_count?: number;
}

interface PostCardProps {
  post: Post;
  nickname: string;
  socket: Socket | null;
  onPostUpdated: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
}

export default function PostCard({
  post: initialPost,
  nickname,
  socket,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) {
  const [post, setPost] = useState(initialPost);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<FlatComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostText, setEditPostText] = useState("");

  const isOwner = post.nickname === nickname;

  const loadComments = async () => {
    if (loaded) return;
    const res = await fetch(`/api/posts/${post.id}/comments`);
    const data = await res.json();
    setComments(data);
    setLoaded(true);
  };

  const toggleComments = async () => {
    if (!expanded) await loadComments();
    setExpanded(!expanded);
  };

  const startEditPost = () => {
    setEditPostText(post.content);
    setEditingPost(true);
  };

  const saveEditPost = async () => {
    const content = editPostText.trim();
    if (!content) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "수정 실패");
        return;
      }
      setPost(data);
      onPostUpdated(data);
      setEditingPost(false);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const deletePostHandler = async () => {
    if (!confirm("게시글을 삭제할까요?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "삭제 실패");
        return;
      }
      onPostDeleted(post.id);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="card post-card">
      <header className="post-header">
        <div className="avatar">{post.nickname[0]}</div>
        <div className="post-header-info">
          <strong>{post.nickname}</strong>
          <time>{formatTime(post.created_at)}</time>
        </div>
        {isOwner && !editingPost && (
          <div className="item-actions">
            <button type="button" className="btn-action" onClick={startEditPost}>
              수정
            </button>
            <button type="button" className="btn-action danger" onClick={deletePostHandler}>
              삭제
            </button>
          </div>
        )}
      </header>

      {editingPost ? (
        <div className="edit-box">
          <textarea
            value={editPostText}
            onChange={(e) => setEditPostText(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="edit-actions">
            <button type="button" className="btn-primary btn-sm" onClick={saveEditPost} disabled={loading}>
              저장
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingPost(false)}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="post-content">{post.content}</p>
      )}

      {post.image_url && (
        <div className="post-image">
          <img src={resolveImageUrl(post.image_url)!} alt="게시글 이미지" loading="lazy" />
        </div>
      )}
      <RecommendationPanel content={post.content} />
      <footer className="post-footer">
        <button type="button" className="btn-ghost" onClick={toggleComments}>
          💬 댓글 {post.comment_count ?? 0}개
        </button>
      </footer>

      {error && !expanded && <p className="error-msg">{error}</p>}

      {expanded && (
        <CommentThread
          postId={post.id}
          nickname={nickname}
          socket={socket}
          comments={comments}
          setComments={setComments}
          onCommentCountChange={(delta) =>
            setPost((p) => ({ ...p, comment_count: Math.max(0, (p.comment_count ?? 0) + delta) }))
          }
        />
      )}
    </article>
  );
}

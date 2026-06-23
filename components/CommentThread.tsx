"use client";

import { useMemo, useState } from "react";
import { Socket } from "socket.io-client";
import { formatTime } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/image-url";
import { buildLocationUrl, isValidMapUrl } from "@/lib/map";
import {
  buildCommentTree,
  collectDescendantIds,
  type CommentNode,
  type FlatComment,
} from "@/lib/comments";
import MapPreview from "./MapPreview";

interface CommentThreadProps {
  postId: string;
  nickname: string;
  socket: Socket | null;
  comments: FlatComment[];
  setComments: React.Dispatch<React.SetStateAction<FlatComment[]>>;
  onCommentCountChange: (delta: number) => void;
}

interface ReplyFormProps {
  postId: string;
  parentId: string;
  parentNickname: string;
  nickname: string;
  depth: number;
  onSuccess: (comment: FlatComment) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

function ReplyForm({
  postId,
  parentId,
  parentNickname,
  nickname,
  depth,
  onSuccess,
  onCancel,
  onError,
}: ReplyFormProps) {
  const [text, setText] = useState(`@${parentNickname} `);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!nickname?.trim()) {
      setError("닉네임을 먼저 설정해주세요");
      return;
    }
    const content = text.trim();
    if (!content) {
      setError("답글 내용을 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("nickname", nickname);
      formData.append("content", content);
      formData.append("parent_id", parentId);

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "답글 작성 실패");
        onError(data.error || "답글 작성 실패");
        return;
      }
      onSuccess(data);
    } catch {
      const msg = "네트워크 오류가 발생했습니다";
      setError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reply-form" style={{ marginLeft: `${Math.min(depth, 6) * 0.75}rem` }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`${parentNickname}에게 답글...`}
        maxLength={500}
        rows={2}
        autoFocus
      />
      <div className="reply-form-actions">
        <span className="char-count">{text.length}/500</span>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="btn-primary btn-sm" onClick={submit} disabled={submitting}>
          {submitting ? "..." : "답글"}
        </button>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

interface CommentItemProps {
  comment: CommentNode;
  depth: number;
  postId: string;
  nickname: string;
  socket: Socket | null;
  parentNickname?: string;
  editingCommentId: string | null;
  editCommentText: string;
  setEditingCommentId: (id: string | null) => void;
  setEditCommentText: (text: string) => void;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  onCommentsChange: React.Dispatch<React.SetStateAction<FlatComment[]>>;
  onCommentCountChange: (delta: number) => void;
  onError: (msg: string) => void;
  onReloadComments: () => Promise<void>;
  allComments: FlatComment[];
}

function CommentItem({
  comment,
  depth,
  postId,
  nickname,
  socket,
  parentNickname,
  editingCommentId,
  editCommentText,
  setEditingCommentId,
  setEditCommentText,
  replyingToId,
  setReplyingToId,
  onCommentsChange,
  onCommentCountChange,
  onError,
  onReloadComments,
  allComments,
}: CommentItemProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const isOwner = comment.nickname === nickname;
  const isEditing = editingCommentId === comment.id;
  const isReplying = replyingToId === comment.id;

  const saveEdit = async () => {
    const content = editCommentText.trim();
    if (!content) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "댓글 수정 실패");
        return;
      }
      onCommentsChange((prev) => prev.map((c) => (c.id === comment.id ? data : c)));
      setEditingCommentId(null);
    } catch {
      onError("네트워크 오류가 발생했습니다");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteHandler = async () => {
    if (!confirm("댓글과 하위 답글을 모두 삭제할까요?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "댓글 삭제 실패");
        return;
      }
      const removeIds = new Set([comment.id, ...collectDescendantIds(allComments, comment.id)]);
      onCommentsChange((prev) => prev.filter((c) => !removeIds.has(c.id)));
      onCommentCountChange(-(data.deleted ?? removeIds.size));
      if (replyingToId && removeIds.has(replyingToId)) setReplyingToId(null);
    } catch {
      onError("네트워크 오류가 발생했습니다");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplySuccess = (newComment: FlatComment) => {
    onCommentsChange((prev) => [...prev, newComment]);
    onCommentCountChange(1);
    setReplyingToId(null);
    socket?.emit("comment:new", newComment);
  };

  return (
    <div className={`comment-item ${depth > 0 ? "comment-reply" : ""}`}>
      <div
        className="comment-item-inner"
        style={{ marginLeft: depth > 0 ? `${Math.min(depth, 6) * 0.75}rem` : undefined }}
      >
        <div className="comment-header">
          <div>
            <strong>{comment.nickname}</strong>
            {parentNickname && (
              <span className="comment-reply-to">↳ @{parentNickname}</span>
            )}
            <time>{formatTime(comment.created_at)}</time>
          </div>
          {isOwner && !isEditing && (
            <div className="item-actions">
              <button
                type="button"
                className="btn-action"
                onClick={() => {
                  setEditingCommentId(comment.id);
                  setEditCommentText(comment.content);
                }}
              >
                수정
              </button>
              <button type="button" className="btn-action danger" onClick={deleteHandler}>
                삭제
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="edit-box">
            <textarea
              value={editCommentText}
              onChange={(e) => setEditCommentText(e.target.value)}
              maxLength={500}
              rows={2}
            />
            <div className="edit-actions">
              <button type="button" className="btn-primary btn-sm" onClick={saveEdit} disabled={actionLoading}>
                저장
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingCommentId(null)}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            {comment.content && <p className="comment-content">{comment.content}</p>}
            {comment.image_url && (
              <div className="comment-image">
                <img src={resolveImageUrl(comment.image_url)!} alt="댓글 이미지" loading="lazy" />
              </div>
            )}
            {comment.map_url && <MapPreview url={comment.map_url} compact />}
            <button
              type="button"
              className="btn-reply"
              onClick={() => setReplyingToId(isReplying ? null : comment.id)}
            >
              💬 답글
            </button>
          </>
        )}
      </div>

      {isReplying && (
        <ReplyForm
          postId={postId}
          parentId={comment.id}
          parentNickname={comment.nickname}
          nickname={nickname}
          depth={depth + 1}
          onSuccess={handleReplySuccess}
          onCancel={() => setReplyingToId(null)}
          onError={async (msg) => {
            onError(msg);
            if (msg.includes("답글 대상")) await onReloadComments();
          }}
        />
      )}

      {comment.children.length > 0 && (
        <div className="comment-children">
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              postId={postId}
              nickname={nickname}
              socket={socket}
              parentNickname={comment.nickname}
              editingCommentId={editingCommentId}
              editCommentText={editCommentText}
              setEditingCommentId={setEditingCommentId}
              setEditCommentText={setEditCommentText}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onCommentsChange={onCommentsChange}
              onCommentCountChange={onCommentCountChange}
              onError={onError}
              onReloadComments={onReloadComments}
              allComments={allComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({
  postId,
  nickname,
  socket,
  comments,
  setComments,
  onCommentCountChange,
}: CommentThreadProps) {
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState("");
  const [showMapInput, setShowMapInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  const reloadComments = async () => {
    const res = await fetch(`/api/posts/${postId}/comments`);
    const data = await res.json();
    if (Array.isArray(data)) setComments(data);
  };

  const handleCommentImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentImage(file);
      setCommentImagePreview(URL.createObjectURL(file));
    }
  };

  const removeCommentImage = () => {
    setCommentImage(null);
    if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
    setCommentImagePreview(null);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 공유를 지원하지 않습니다");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapUrl(buildLocationUrl(pos.coords.latitude, pos.coords.longitude));
        setShowMapInput(true);
        setLocating(false);
      },
      () => {
        setError("위치를 가져올 수 없습니다. 권한을 확인해주세요");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetCommentForm = () => {
    setCommentText("");
    removeCommentImage();
    setMapUrl("");
    setShowMapInput(false);
    setError("");
  };

  const submitComment = async () => {
    if (!nickname?.trim()) {
      setError("닉네임을 먼저 설정해주세요");
      return;
    }

    const text = commentText.trim();
    const map = mapUrl.trim();

    if (!text && !commentImage && !map) {
      setError("내용, 사진, 지도 중 하나 이상을 입력해주세요");
      return;
    }
    if (map && !isValidMapUrl(map)) {
      setError("지원하지 않는 지도 URL입니다");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("nickname", nickname);
      formData.append("content", text);
      if (commentImage) formData.append("image", commentImage);
      if (map) formData.append("map_url", map);

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "댓글 작성 실패");
        return;
      }
      setComments((prev) => [...prev, data]);
      onCommentCountChange(1);
      resetCommentForm();
      socket?.emit("comment:new", data);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comments-section">
      <div className="comments-list">
        {tree.length === 0 && <p className="empty-msg">첫 댓글을 남겨보세요!</p>}
        {tree.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            depth={0}
            postId={postId}
            nickname={nickname}
            socket={socket}
            editingCommentId={editingCommentId}
            editCommentText={editCommentText}
            setEditingCommentId={setEditingCommentId}
            setEditCommentText={setEditCommentText}
            replyingToId={replyingToId}
            setReplyingToId={setReplyingToId}
            onCommentsChange={setComments}
            onCommentCountChange={onCommentCountChange}
            onError={setError}
            onReloadComments={reloadComments}
            allComments={comments}
          />
        ))}
      </div>

      <div className="comment-form">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글을 입력하세요..."
          maxLength={500}
          rows={2}
        />
        {commentImagePreview && (
          <div className="image-preview comment-preview">
            <img src={commentImagePreview} alt="댓글 미리보기" />
            <button type="button" className="remove-image" onClick={removeCommentImage}>
              ✕
            </button>
          </div>
        )}
        {showMapInput && (
          <div className="map-input-row">
            <input
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="지도 URL (Google, Naver, Kakao)"
            />
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setMapUrl("");
                setShowMapInput(false);
              }}
            >
              ✕
            </button>
          </div>
        )}
        {mapUrl && isValidMapUrl(mapUrl) && <MapPreview url={mapUrl} compact />}
        <div className="comment-form-actions">
          <label className="btn-upload btn-sm-upload">
            📷
            <input type="file" accept="image/*" onChange={handleCommentImage} hidden />
          </label>
          <button type="button" className="btn-upload btn-sm-upload" onClick={() => setShowMapInput(true)}>
            🗺️
          </button>
          <button type="button" className="btn-upload btn-sm-upload" onClick={shareLocation} disabled={locating}>
            {locating ? "..." : "📍"}
          </button>
          <span className="char-count">{commentText.length}/500</span>
          <button type="button" className="btn-primary btn-sm" onClick={submitComment} disabled={loading}>
            {loading ? "등록 중..." : "등록"}
          </button>
        </div>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}

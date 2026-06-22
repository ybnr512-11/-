"use client";

import { useState } from "react";
import { formatTime } from "@/lib/utils";
import { buildLocationUrl, isValidMapUrl } from "@/lib/map";
import { Socket } from "socket.io-client";
import MapPreview from "./MapPreview";
import RecommendationPanel from "./RecommendationPanel";

interface Post {
  id: string;
  nickname: string;
  content: string;
  image_url: string | null;
  created_at: number;
  comment_count?: number;
}

interface Comment {
  id: string;
  post_id: string;
  nickname: string;
  content: string;
  image_url: string | null;
  map_url: string | null;
  created_at: number;
}

interface PostCardProps {
  post: Post;
  nickname: string;
  socket: Socket | null;
}

export default function PostCard({ post, nickname, socket }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState("");
  const [showMapInput, setShowMapInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

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
        const url = buildLocationUrl(pos.coords.latitude, pos.coords.longitude);
        setMapUrl(url);
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

      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "댓글 작성 실패");
        return;
      }
      setComments((prev) => [...prev, data]);
      resetCommentForm();
      socket?.emit("comment:new", data);
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
        <div>
          <strong>{post.nickname}</strong>
          <time>{formatTime(post.created_at)}</time>
        </div>
      </header>
      <p className="post-content">{post.content}</p>
      {post.image_url && (
        <div className="post-image">
          <img src={post.image_url} alt="게시글 이미지" loading="lazy" />
        </div>
      )}
      <RecommendationPanel content={post.content} />
      <footer className="post-footer">
        <button className="btn-ghost" onClick={toggleComments}>
          💬 댓글 {post.comment_count ?? 0}개
        </button>
      </footer>

      {expanded && (
        <div className="comments-section">
          <div className="comments-list">
            {comments.length === 0 && (
              <p className="empty-msg">첫 댓글을 남겨보세요!</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="comment-item">
                <div className="comment-header">
                  <strong>{c.nickname}</strong>
                  <time>{formatTime(c.created_at)}</time>
                </div>
                {c.content && <p className="comment-content">{c.content}</p>}
                {c.image_url && (
                  <div className="comment-image">
                    <img src={c.image_url} alt="댓글 이미지" loading="lazy" />
                  </div>
                )}
                {c.map_url && <MapPreview url={c.map_url} compact />}
              </div>
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
                  onClick={() => { setMapUrl(""); setShowMapInput(false); }}
                >
                  ✕
                </button>
              </div>
            )}
            {mapUrl && isValidMapUrl(mapUrl) && (
              <MapPreview url={mapUrl} compact />
            )}
            <div className="comment-form-actions">
              <label className="btn-upload btn-sm-upload">
                📷
                <input type="file" accept="image/*" onChange={handleCommentImage} hidden />
              </label>
              <button
                type="button"
                className="btn-upload btn-sm-upload"
                onClick={() => setShowMapInput(true)}
              >
                🗺️
              </button>
              <button
                type="button"
                className="btn-upload btn-sm-upload"
                onClick={shareLocation}
                disabled={locating}
              >
                {locating ? "..." : "📍"}
              </button>
              <span className="char-count">{commentText.length}/500</span>
              <button className="btn-primary btn-sm" onClick={submitComment} disabled={loading}>
                {loading ? "등록 중..." : "등록"}
              </button>
            </div>
            {error && <p className="error-msg">{error}</p>}
          </div>
        </div>
      )}
    </article>
  );
}

"use client";

import { useState } from "react";
import { Socket } from "socket.io-client";

interface PostFormProps {
  nickname: string;
  socket: Socket | null;
  onPostCreated: () => void;
}

export default function PostForm({ nickname, socket, onPostCreated }: PostFormProps) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const submit = async () => {
    if (!content.trim()) {
      setError("내용을 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("nickname", nickname);
    formData.append("content", content.trim());
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/posts", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "작성 실패");
        return;
      }
      socket?.emit("post:new", data);
      setContent("");
      removeImage();
      onPostCreated();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card post-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="판교 소식을 전해주세요... 🏙️"
        maxLength={1000}
        rows={3}
      />
      {preview && (
        <div className="image-preview">
          <img src={preview} alt="미리보기" />
          <button type="button" className="remove-image" onClick={removeImage}>
            ✕
          </button>
        </div>
      )}
      <div className="form-actions">
        <label className="btn-upload">
          📷 사진
          <input type="file" accept="image/*" onChange={handleImage} hidden />
        </label>
        <span className="char-count">{content.length}/1000</span>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "올리는 중..." : "올리기"}
        </button>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

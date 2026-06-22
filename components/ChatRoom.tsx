"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { formatTime } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/image-url";

interface ChatMessage {
  id: string;
  nickname: string;
  content: string;
  image_url: string | null;
  created_at: number;
}

interface ChatRoomProps {
  nickname: string;
  socket: Socket | null;
}

export default function ChatRoom({ nickname, socket }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch("/api/chat");
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket) return;
    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev.filter((m) => m.id !== msg.id), msg]);
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:message", onMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (connected) return;
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [connected, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const pickImage = (file: File | null) => {
    clearImage();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("이미지는 5MB 이하만 가능합니다");
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !image) || sending) return;
    setSending(true);
    setError("");

    try {
      if (image || !socket?.connected) {
        const formData = new FormData();
        formData.append("nickname", nickname);
        formData.append("content", text);
        if (image) formData.append("image", image);

        const res = await fetch("/api/chat", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "전송 실패");
          return;
        }
        setMessages((prev) => [...prev.filter((m) => m.id !== data.id), data]);
        if (socket?.connected) {
          socket.emit("chat:broadcast", data);
        }
        setInput("");
        clearImage();
        return;
      }

      socket.emit("chat:message", { nickname, content: text });
      setInput("");
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-room">
      <div className="chat-status">
        <span className={`status-dot ${connected ? "online" : "offline"}`} />
        {connected ? "실시간 연결됨" : "자동 새로고침 모드 (3초)"}
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="empty-msg">대화를 시작해보세요! 👋</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.nickname === nickname;
          const imgSrc = resolveImageUrl(msg.image_url);
          return (
            <div key={msg.id} className={`chat-item ${isMe ? "mine" : "other"}`}>
              <div className="chat-meta">
                <strong className="chat-nick">
                  {msg.nickname}
                  {isMe && " (나)"}
                </strong>
                <time>{formatTime(msg.created_at)}</time>
              </div>
              <div className={`chat-bubble ${isMe ? "mine" : "other"}`}>
                {msg.content && <p>{msg.content}</p>}
                {imgSrc && (
                  <div className="chat-image">
                    <img src={imgSrc} alt="채팅 이미지" loading="lazy" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {imagePreview && (
        <div className="chat-image-preview">
          <img src={imagePreview} alt="첨부 미리보기" />
          <button type="button" className="btn-ghost btn-sm" onClick={clearImage}>
            ✕
          </button>
        </div>
      )}
      <div className="chat-input">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="btn-ghost chat-attach"
          onClick={() => fileRef.current?.click()}
          title="이미지 첨부"
        >
          📷
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          maxLength={500}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          className="btn-primary"
          onClick={send}
          disabled={(!input.trim() && !image) || sending}
        >
          {sending ? "..." : "전송"}
        </button>
      </div>
      {error && <p className="error-msg chat-error">{error}</p>}
    </div>
  );
}

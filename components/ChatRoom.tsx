"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { formatTime } from "@/lib/utils";

interface ChatMessage {
  id: string;
  nickname: string;
  content: string;
  created_at: number;
}

interface ChatRoomProps {
  nickname: string;
  socket: Socket | null;
}

export default function ChatRoom({ nickname, socket }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");

    try {
      if (socket?.connected) {
        socket.emit("chat:message", { nickname, content: text });
        setInput("");
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "전송 실패");
        return;
      }
      setMessages((prev) => [...prev, data]);
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
                <p>{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input">
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
          disabled={!input.trim() || sending}
        >
          {sending ? "..." : "전송"}
        </button>
      </div>
      {error && <p className="error-msg chat-error">{error}</p>}
    </div>
  );
}

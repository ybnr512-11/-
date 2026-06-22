"use client";

import { useEffect, useRef, useState } from "react";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then(setMessages);
  }, []);

  useEffect(() => {
    if (!socket) return;
    setConnected(socket.connected);
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("chat:message");
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || !socket) return;
    socket.emit("chat:message", { nickname, content: text });
    setInput("");
  };

  return (
    <div className="chat-room">
      <div className="chat-status">
        <span className={`status-dot ${connected ? "online" : "offline"}`} />
        {connected ? "실시간 연결됨" : "연결 중..."}
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="empty-msg">대화를 시작해보세요! 👋</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.nickname === nickname;
          return (
            <div key={msg.id} className={`chat-bubble ${isMe ? "mine" : "other"}`}>
              {!isMe && <strong className="chat-nick">{msg.nickname}</strong>}
              <p>{msg.content}</p>
              <time>{formatTime(msg.created_at)}</time>
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
        <button className="btn-primary" onClick={send} disabled={!connected}>
          전송
        </button>
      </div>
    </div>
  );
}

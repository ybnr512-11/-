"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, PlaceLink } from "@/lib/ai-types";

interface ChatbotProps {
  nickname: string;
}

const STARTERS = [
  "판교역 근처 점심 맛집 추천해줘",
  "판교 테크노밸리 카페 어디가 좋아?",
  "판교 주차하기 편한 곳 알려줘",
  "판교 회식하기 좋은 곳",
];

export default function Chatbot({ nickname }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "안녕하세요! 판교 AI 도우미예요 🏙️\n맛집·카페 질문은 **Google 검색** 결과를 바탕으로 추천하며, 각 업체 🗺️ 버튼으로 **Google 지도** 위치를 열 수 있어요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "응답 생성 실패");
        setMessages(messages);
        return;
      }
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
          sources: data.sources,
          placeLinks: data.placeLinks,
        },
      ]);
    } catch {
      setError("네트워크 오류가 발생했습니다");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot">
      <div className="chatbot-header">
        <span className="chatbot-badge">검색 기반 AI</span>
        <p>맛집·카페는 Google 검색 + Google 지도 링크</p>
      </div>

      {messages.length === 1 && (
        <div className="chatbot-starters">
          {STARTERS.map((q) => (
            <button key={q} type="button" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chatbot-bubble ${msg.role === "user" ? "user" : "assistant"}`}
          >
            {msg.role === "assistant" && <span className="chatbot-avatar">🤖</span>}
            <div className="chatbot-text">
              {msg.content}
              {msg.placeLinks && msg.placeLinks.length > 0 && (
                <div className="chatbot-place-links">
                  {msg.placeLinks.map((p: PlaceLink, idx) => (
                    <a
                      key={`${p.name}-${p.address}`}
                      href={p.placeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="place-link-card"
                    >
                      <span className="place-link-num">{idx + 1}</span>
                      <span className="place-link-info">
                        <strong>{p.name}</strong>
                        <span>{p.address}</span>
                      </span>
                      <span className="place-link-go">🗺️ Google</span>
                    </a>
                  ))}
                </div>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <span className="chatbot-sources">📍 출처: {msg.sources.join(" · ")}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chatbot-bubble assistant">
            <span className="chatbot-avatar">🤖</span>
            <div className="chatbot-text chatbot-typing">생각하는 중...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chatbot-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="판교 맛집, 카페, 주차 등 무엇이든 물어보세요..."
          maxLength={1000}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
          전송
        </button>
      </div>
      {error && <p className="error-msg chatbot-error">{error}</p>}
    </div>
  );
}

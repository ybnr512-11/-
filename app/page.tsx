"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import NicknameBar from "@/components/NicknameBar";
import Timeline from "@/components/Timeline";
import ChatRoom from "@/components/ChatRoom";
import Chatbot from "@/components/Chatbot";

type Tab = "timeline" | "chat" | "ai";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "timeline", icon: "📰", label: "타임라인" },
  { id: "chat", icon: "💬", label: "실시간 대화" },
  { id: "ai", icon: "🤖", label: "AI 도우미" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("timeline");
  const [nickname, setNickname] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleNicknameChange = useCallback((name: string) => {
    setNickname(name);
  }, []);

  useEffect(() => {
    const s = io({ path: "/socket.io" });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="logo">
            <span className="logo-icon">📬</span>
            <div>
              <h1>판교 대신 전해드립니다</h1>
              <p>판교 사람들의 자유로운 소식 공유 공간</p>
            </div>
          </div>
        </div>
        <NicknameBar onNicknameChange={handleNicknameChange} />
      </header>

      <nav className="tabs" aria-label="메인 메뉴">
        {TABS.map(({ id, icon, label }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <span className="tab-icon">{icon}</span>
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === "timeline" && <Timeline nickname={nickname} socket={socket} />}
        {tab === "chat" && <ChatRoom nickname={nickname} socket={socket} />}
        {tab === "ai" && <Chatbot nickname={nickname} />}
      </main>

      <footer className="footer">
        <p>로그인 없이 자유롭게 · 닉네임은 브라우저에 저장됩니다</p>
        <p className="footer-link">
          공유 링크:{" "}
          <a href="https://ybnr512-11.vercel.app" target="_blank" rel="noopener noreferrer">
            ybnr512-11.vercel.app
          </a>
        </p>
      </footer>
    </div>
  );
}

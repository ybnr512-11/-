"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import NicknameBar from "@/components/NicknameBar";
import Timeline from "@/components/Timeline";
import ChatRoom from "@/components/ChatRoom";

type Tab = "timeline" | "chat";

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
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">📬</span>
            <div>
              <h1>판교 대신 전해드립니다</h1>
              <p>판교 사람들의 자유로운 소식 공유 공간</p>
            </div>
          </div>
          <NicknameBar onNicknameChange={handleNicknameChange} />
        </div>
      </header>

      <nav className="tabs">
        <button
          className={tab === "timeline" ? "active" : ""}
          onClick={() => setTab("timeline")}
        >
          📰 소식 타임라인
        </button>
        <button
          className={tab === "chat" ? "active" : ""}
          onClick={() => setTab("chat")}
        >
          💬 실시간 대화
        </button>
      </nav>

      <main className="main">
        {tab === "timeline" ? (
          <Timeline nickname={nickname} socket={socket} />
        ) : (
          <ChatRoom nickname={nickname} socket={socket} />
        )}
      </main>

      <footer className="footer">
        <p>로그인 없이 자유롭게 이용하세요 · 닉네임은 브라우저에 저장됩니다</p>
      </footer>
    </div>
  );
}

"use client";

const NICKNAME_KEY = "pangyo_nickname";

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NICKNAME_KEY) || "";
}

export function setNickname(name: string) {
  localStorage.setItem(NICKNAME_KEY, name.trim());
}

export function getOrCreateNickname(): string {
  let name = getNickname();
  if (!name) {
    const adjectives = ["행복한", "즐거운", "맛있는", "따뜻한", "활기찬", "조용한"];
    const nouns = ["판교인", "테크노", "카페러", "점심러", "출근러", "퇴근러"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    name = `${adj}${noun}${Math.floor(Math.random() * 100)}`;
    setNickname(name);
  }
  return name;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

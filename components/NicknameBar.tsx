"use client";

import { useEffect, useState } from "react";
import { getOrCreateNickname, setNickname } from "@/lib/utils";

interface NicknameBarProps {
  onNicknameChange: (name: string) => void;
}

export default function NicknameBar({ onNicknameChange }: NicknameBarProps) {
  const [nickname, setLocal] = useState("");
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    const name = getOrCreateNickname();
    setLocal(name);
    onNicknameChange(name);
  }, [onNicknameChange]);

  const save = () => {
    const trimmed = input.trim();
    if (trimmed && trimmed.length <= 20) {
      setNickname(trimmed);
      setLocal(trimmed);
      onNicknameChange(trimmed);
      setEditing(false);
    }
  };

  return (
    <div className="nickname-bar">
      <span className="nickname-label">내 닉네임</span>
      {editing ? (
        <div className="nickname-edit">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={20}
            placeholder="닉네임 입력"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button onClick={save}>저장</button>
          <button className="btn-ghost" onClick={() => setEditing(false)}>
            취소
          </button>
        </div>
      ) : (
        <div className="nickname-display">
          <strong>{nickname}</strong>
          <button className="btn-ghost btn-sm" onClick={() => { setInput(nickname); setEditing(true); }}>
            변경
          </button>
        </div>
      )}
    </div>
  );
}

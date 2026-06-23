"use client";

import { useEffect, useState } from "react";
import { detectCategoryOrDefault } from "@/lib/keywords";
import { getRecommendSourceLabel } from "@/lib/recommend-label";

interface RecommendItem {
  name: string;
  area: string;
  reason: string;
  highlights: string;
  rankHint: string;
  googleMapUrl?: string;
  naverMapUrl?: string;
}

interface RecommendData {
  category: string;
  keywords: string[];
  summary: string;
  source?: "naver" | "google";
  items: RecommendItem[];
}

interface RecommendationPanelProps {
  content: string;
}

export default function RecommendationPanel({ content }: RecommendationPanelProps) {
  const text = content.trim();
  const detected = detectCategoryOrDefault(text);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<RecommendData | null>(null);

  useEffect(() => {
    setData(null);
    setError("");
    setOpen(false);
  }, [content]);

  if (!text) return null;

  const fetchRecommendations = async () => {
    if (data) {
      setOpen(!open);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "추천을 불러오지 못했습니다");
        return;
      }
      setData(json);
      setOpen(true);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel =
    detected.id === "general" && detected.keywords.length === 0
      ? "AI 추천"
      : `${detected.label} 추천`;

  return (
    <div className="recommend-panel">
      <button
        type="button"
        className="recommend-trigger"
        onClick={fetchRecommendations}
        disabled={loading}
      >
        {detected.emoji} AI {buttonLabel} {loading ? "분석 중..." : open && data ? "접기" : "보기"}
      </button>

      {error && <p className="error-msg">{error}</p>}

      {open && data && (
        <div className="recommend-body">
          <span className="recommend-source-badge">
            📍 {getRecommendSourceLabel(data.source)} 기반
          </span>
          <p className="recommend-summary">{data.summary}</p>
          <ul className="recommend-list">
            {data.items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="recommend-item">
                <div className="recommend-rank">{i + 1}</div>
                <div className="recommend-info">
                  <strong>{item.name}</strong>
                  <span className="recommend-area">{item.area}</span>
                  <p>{item.reason}</p>
                  {item.highlights && (
                    <span className="recommend-highlight">{item.highlights}</span>
                  )}
                  {item.rankHint && (
                    <span className="recommend-rank-hint">📊 {item.rankHint}</span>
                  )}
                  <div className="recommend-links">
                    <a
                      href={item.googleMapUrl || item.naverMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recommend-link recommend-link-map"
                    >
                      Google 지도
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="recommend-disclaimer">
            {data.source === "naver"
              ? "네이버 지역 검색 API 결과입니다. 위치는 Google 지도 링크로 확인해주세요."
              : "Google 검색 기반 AI 추천입니다. 방문 전 Google 지도에서 최신 정보를 확인해주세요."}
          </p>
        </div>
      )}
    </div>
  );
}

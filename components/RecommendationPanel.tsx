"use client";

import { useEffect, useState } from "react";
import { detectCategory } from "@/lib/keywords";
import type { EnrichedRecommendResult } from "@/lib/gemini";

interface RecommendationPanelProps {
  content: string;
}

export default function RecommendationPanel({ content }: RecommendationPanelProps) {
  const detected = detectCategory(content);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<EnrichedRecommendResult | null>(null);

  useEffect(() => {
    setData(null);
    setError("");
    setOpen(false);
  }, [content]);

  if (!detected) return null;

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
        body: JSON.stringify({ content }),
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

  return (
    <div className="recommend-panel">
      <button
        type="button"
        className="recommend-trigger"
        onClick={fetchRecommendations}
        disabled={loading}
      >
        {detected.emoji} AI {detected.label} 추천 {loading ? "분석 중..." : open && data ? "접기" : "보기"}
      </button>

      {error && <p className="error-msg">{error}</p>}

      {open && data && (
        <div className="recommend-body">
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
                      href={item.naverSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recommend-link"
                    >
                      네이버 검색
                    </a>
                    <a
                      href={item.naverMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recommend-link recommend-link-map"
                    >
                      네이버 지도
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="recommend-disclaimer">
            AI가 생성한 추천입니다. 방문 전 네이버에서 최신 리뷰·영업시간을 확인해주세요.
          </p>
        </div>
      )}
    </div>
  );
}

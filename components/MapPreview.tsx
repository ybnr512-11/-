"use client";

import { getMapEmbedUrl } from "@/lib/map";

interface MapPreviewProps {
  url: string;
  compact?: boolean;
}

export default function MapPreview({ url, compact = false }: MapPreviewProps) {
  const embedUrl = getMapEmbedUrl(url);

  return (
    <div className={`map-preview ${compact ? "compact" : ""}`}>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title="지도"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="map-link-card">
          <span className="map-link-icon">📍</span>
          <span className="map-link-text">지도에서 위치 보기</span>
        </a>
      )}
    </div>
  );
}

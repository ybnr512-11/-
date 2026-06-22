"use client";

import { useEffect, useState } from "react";
import { PUBLIC_SITE_URL, getPublicSiteLabel } from "@/lib/site";

export default function ShareLink() {
  const [url, setUrl] = useState(PUBLIC_SITE_URL);

  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  const label = getPublicSiteLabel(url);

  return (
    <p className="footer-link">
      공유 링크:{" "}
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </p>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "판교 대신 전해드립니다",
  description: "판교 지역 사람들을 위한 자유 커뮤니티",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

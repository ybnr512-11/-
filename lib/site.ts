export const SITE_TITLE = "판교 대신 전해드립니다";

/** Vercel 프로젝트명을 pangdaejun 등으로 바꾼 뒤 맞춰 설정 */
export const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pangdaejun.vercel.app";

export function getPublicSiteLabel(url: string) {
  return url.replace(/^https?:\/\//, "");
}

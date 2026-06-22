/** Vercel /tmp 저장 파일은 /api/uploads 로 제공 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/api/uploads/")) return url;
  if (url.startsWith("/uploads/")) return `/api/uploads/${url.slice("/uploads/".length)}`;
  return url;
}

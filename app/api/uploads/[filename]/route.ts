import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { uploadsDir } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename);
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

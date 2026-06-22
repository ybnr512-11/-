import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadsDir } from "@/lib/db";

const MAX_SIZE = 5 * 1024 * 1024;

export async function saveUploadedImage(image: File): Promise<string | null> {
  if (!image || image.size === 0) return null;
  if (image.size > MAX_SIZE) {
    throw new Error("IMAGE_TOO_LARGE");
  }
  const ext = path.extname(image.name) || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/api/uploads/${filename}`;
}

import { NextResponse } from "next/server";
import { getChatMessages } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const messages = getChatMessages(100);
  return NextResponse.json(messages);
}

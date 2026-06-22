import { NextResponse } from "next/server";
import { getChatMessages } from "@/lib/db";

export async function GET() {
  const messages = getChatMessages(100);
  return NextResponse.json(messages);
}

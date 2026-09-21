import { NextResponse } from "next/server";
import { getSendHistory } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ entries: getSendHistory() });
}

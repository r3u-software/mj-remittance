import { NextRequest, NextResponse } from "next/server";
import { readSmtpConfig, writeSmtpConfig, smtpConfigSource } from "@/lib/smtpConfig";

export const runtime = "nodejs";

export async function GET() {
  const config = readSmtpConfig();
  const source = smtpConfigSource();
  return NextResponse.json({
    source,
    host: config?.host ?? "",
    port: config?.port ?? 587,
    user: config?.user ?? "",
    from: config?.from ?? "",
    hasPassword: Boolean(config?.pass),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { host, port, user, pass, from } = body ?? {};

  if (!host || !user || !from) {
    return NextResponse.json({ error: "Host, username, and from address are required." }, { status: 400 });
  }

  // An empty password on save means "keep the existing one" — the
  // settings form never round-trips the real saved password back into
  // the browser (see GET, which only ever sends hasPassword: boolean).
  const existing = readSmtpConfig();
  const resolvedPass = pass || existing?.pass;
  if (!resolvedPass) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  writeSmtpConfig({
    host: String(host),
    port: Number(port) || 587,
    user: String(user),
    pass: String(resolvedPass),
    from: String(from),
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { testSmtpConnection } from "@/lib/mailer";
import { readSmtpConfig } from "@/lib/smtpConfig";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { host, port, user, pass, from } = body ?? {};

  if (!host || !user) {
    return NextResponse.json({ ok: false, error: "Host and username are required." }, { status: 400 });
  }

  // Same "blank password = use the saved one" rule as the save
  // endpoint, so you can hit Test right after loading the page (when
  // the password field is intentionally left blank) without re-typing it.
  const resolvedPass = pass || readSmtpConfig()?.pass;
  if (!resolvedPass) {
    return NextResponse.json({ ok: false, error: "Password is required." }, { status: 400 });
  }

  const result = await testSmtpConnection({
    host: String(host),
    port: Number(port) || 587,
    user: String(user),
    pass: String(resolvedPass),
    from: String(from || user),
  });

  return NextResponse.json(result);
}

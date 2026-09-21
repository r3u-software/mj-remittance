import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { sendRemittanceEmails } from "@/lib/mailer";
import type { SendRequestItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const items = body?.items as SendRequestItem[] | undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No recipients selected." }, { status: 400 });
  }

  const invalid = items.find((item) => !item.email || !item.supplierNo || !item.pdfBase64);
  if (invalid) {
    return NextResponse.json(
      { error: `Item for supplier ${invalid.supplierNo ?? "?"} is missing a required field.` },
      { status: 400 }
    );
  }

  const runId = randomUUID();
  const results = await sendRemittanceEmails(runId, items);
  const dryRun = results.every((r) => r.status === "dry-run");

  return NextResponse.json({ runId, dryRun, results });
}

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { buildEmlContent } from "@/lib/eml";
import { readSmtpConfig } from "@/lib/smtpConfig";
import type { SendRequestItem } from "@/lib/types";

export const runtime = "nodejs";

const DEFAULT_FROM = "Cummins South Pacific Accounts Payable <cbs.ap.au@cummins.com>";

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

  // Uses the saved SMTP "from" if there is one, purely for a realistic
  // sender header — the .eml is never sent by this app, so no SMTP
  // config is actually required to use this feature.
  const from = readSmtpConfig()?.from || DEFAULT_FROM;

  if (items.length === 1) {
    const eml = buildEmlContent(items[0]!, from);
    return new NextResponse(eml, {
      headers: {
        "Content-Type": "message/rfc822",
        "Content-Disposition": `attachment; filename="${items[0]!.supplierNo}.eml"`,
      },
    });
  }

  const zip = new JSZip();
  for (const item of items) {
    zip.file(`${item.supplierNo}.eml`, buildEmlContent(item, from));
  }
  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  const dateStamp = new Date().toISOString().slice(0, 10);

  // Wrapped in a Blob (via Uint8Array.from, which yields a plain
  // ArrayBuffer-backed array) rather than passed as JSZip's raw
  // Uint8Array — Node's typed-array typings (generic over
  // ArrayBufferLike, which also covers SharedArrayBuffer) don't
  // structurally match DOM's BlobPart/BodyInit (ArrayBuffer only).
  return new NextResponse(new Blob([Uint8Array.from(zipBuffer)], { type: "application/zip" }), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="remittance-emails-${dateStamp}.zip"`,
    },
  });
}

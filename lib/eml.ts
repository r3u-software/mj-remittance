import { buildEmailBody, buildEmailSubject } from "./emailTemplate";
import type { SendRequestItem } from "./types";

/**
 * Builds a standard RFC822/MIME .eml file (multipart/mixed: a text body
 * plus the PDF as a base64 attachment) — opens directly in Outlook,
 * Thunderbird, Apple Mail, etc. Uses the exact same subject/body
 * builders as the live preview and the real SMTP send, so this always
 * matches what's shown on screen. No SMTP involved at all — this is
 * just a file, so it works regardless of what's configured in Settings.
 */
export function buildEmlContent(item: SendRequestItem, from: string): string {
  const boundary = `----=_Remittance_${item.supplierNo}_${Date.now()}`;
  const subject = buildEmailSubject(item);
  const body = buildEmailBody(item);

  const headers = [
    `From: ${from}`,
    `To: ${item.email}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    // Tells Outlook (and other clients that honor it) to open this as
    // an editable draft with a working Send button, rather than a
    // read-only "received message" view — without it, Outlook shows
    // no Send button and locks the From/To fields, since it assumes
    // any .eml it opens is a historical message, not a new one to send.
    `X-Unsent: 1`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ].join("\r\n");

  const textPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
  ].join("\r\n");

  // Base64 attachment content is conventionally wrapped at 76 chars/line.
  const pdfLines = item.pdfBase64.match(/.{1,76}/g)?.join("\r\n") ?? item.pdfBase64;
  const attachmentPart = [
    `--${boundary}`,
    `Content-Type: application/pdf; name="${item.supplierNo}.pdf"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${item.supplierNo}.pdf"`,
    ``,
    pdfLines,
  ].join("\r\n");

  return [headers, "", textPart, "", attachmentPart, "", `--${boundary}--`].join("\r\n");
}

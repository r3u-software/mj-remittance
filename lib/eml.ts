import path from "node:path";
import fs from "node:fs";
import { buildEmailBody, buildEmailBodyHtml, buildEmailSubject, EMAIL_LOGO_CID } from "./emailTemplate";
import { buildRemittanceFilename } from "./filename";
import type { SendRequestItem } from "./types";

const logoPath = path.join(process.cwd(), "public", "cummins-logo.png");
const logoBase64 = fs.readFileSync(logoPath).toString("base64");
const logoBase64Lines = logoBase64.match(/.{1,76}/g)?.join("\r\n") ?? logoBase64;

/**
 * Builds a standard RFC822/MIME .eml file — opens directly in Outlook,
 * Thunderbird, Apple Mail, etc. Uses the exact same subject/body
 * builders as the live preview and the real SMTP send, so this always
 * matches what's shown on screen. No SMTP involved at all — this is
 * just a file, so it works regardless of what's configured in Settings.
 *
 * Structure: multipart/mixed (PDF attachment) wrapping a multipart/related
 * (the inline logo signature) wrapping a multipart/alternative (plain text
 * + HTML body) — the standard nesting for "HTML email with an inline image
 * plus a file attachment".
 */
export function buildEmlContent(item: SendRequestItem, from: string): string {
  const stamp = Date.now();
  const mixedBoundary = `----=_Mixed_${item.supplierNo}_${stamp}`;
  const relatedBoundary = `----=_Related_${item.supplierNo}_${stamp}`;
  const altBoundary = `----=_Alt_${item.supplierNo}_${stamp}`;

  const subject = buildEmailSubject(item);
  const textBody = buildEmailBody(item);
  const htmlBody = buildEmailBodyHtml(item);

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
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
  ].join("\r\n");

  const textPart = [
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    textBody,
  ].join("\r\n");

  const htmlPart = [
    `--${altBoundary}`,
    `Content-Type: text/html; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
  ].join("\r\n");

  const alternativePart = [
    `--${relatedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    textPart,
    htmlPart,
    `--${altBoundary}--`,
  ].join("\r\n");

  const logoPart = [
    `--${relatedBoundary}`,
    `Content-Type: image/png; name="cummins-logo.png"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: inline; filename="cummins-logo.png"`,
    `Content-ID: <${EMAIL_LOGO_CID}>`,
    ``,
    logoBase64Lines,
  ].join("\r\n");

  const relatedPart = [
    `--${mixedBoundary}`,
    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
    ``,
    alternativePart,
    logoPart,
    `--${relatedBoundary}--`,
  ].join("\r\n");

  // Base64 attachment content is conventionally wrapped at 76 chars/line.
  const pdfLines = item.pdfBase64.match(/.{1,76}/g)?.join("\r\n") ?? item.pdfBase64;
  const pdfFilename = `${buildRemittanceFilename(item)}.pdf`;
  const attachmentPart = [
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    ``,
    pdfLines,
  ].join("\r\n");

  return [headers, "", relatedPart, "", attachmentPart, "", `--${mixedBoundary}--`].join("\r\n");
}

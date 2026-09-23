// Pure string builders, no server-only imports — shared by lib/mailer.ts
// (the real send), lib/eml.ts (the .eml file), and components/PdfPreview.tsx
// (the on-screen preview), so what you see before sending is exactly what
// goes out.

import { formatCurrency } from "./format";
import { getCompanyProfile } from "./companyInfo";

interface EmailFields {
  supplierNo: string;
  countryCode: string | null;
  reportDate: string | null;
  computedTotal: number;
}

// Content-ID nodemailer/eml.ts embed the Cummins logo under, referenced
// from the HTML body as an inline signature image (cid:...), not an
// attachment the recipient has to open separately.
export const EMAIL_LOGO_CID = "cummins-logo-signature";

export function buildEmailSubject(item: EmailFields): string {
  const company = getCompanyProfile(item.countryCode);
  return `Remittance Advice from ${company.name}`;
}

function bodyParts(item: EmailFields) {
  const company = getCompanyProfile(item.countryCode);
  return {
    greeting: "To Our Valued Stakeholders,",
    // company.name already ends in a period for some profiles (e.g. AU's
    // "Pty. Ltd.") and not others (NZ's "Limited") — end the sentence with
    // "." only when the name doesn't already supply one, so it never doubles up.
    intro: `Please find attached your remittance advice from ${company.name}${company.name.endsWith(".") ? "" : "."}`,
    details: [
      `Supplier no: ${item.supplierNo}`,
      `Date: ${item.reportDate ?? "-"}`,
      `Total this Debit: ${formatCurrency(item.computedTotal)}`,
    ],
    closing: `This is a system-generated email. If you have any queries, please contact ${company.registerEmail}.`,
    signOff: ["Sincerely yours,", "Cummins Services - Accounts Payable Team"],
  };
}

export function buildEmailBody(item: EmailFields): string {
  const p = bodyParts(item);
  return [p.greeting, "", p.intro, "", ...p.details, "", p.closing, "", ...p.signOff].join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** HTML version of the body, with the Cummins logo embedded as the email signature (via cid:EMAIL_LOGO_CID). */
export function buildEmailBodyHtml(item: EmailFields): string {
  const p = bodyParts(item);
  return [
    `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a1a; line-height: 1.5;">`,
    `<p>${escapeHtml(p.greeting)}</p>`,
    `<p>${escapeHtml(p.intro)}</p>`,
    `<p>${p.details.map(escapeHtml).join("<br/>")}</p>`,
    `<p>${escapeHtml(p.closing)}</p>`,
    `<p>${p.signOff.map(escapeHtml).join("<br/>")}</p>`,
    `<p style="margin-top: 8px;"><img src="cid:${EMAIL_LOGO_CID}" alt="Cummins" width="150" style="display:block;" /></p>`,
    `</div>`,
  ].join("\n");
}

// Pure string builders, no server-only imports — shared by lib/mailer.ts
// (the real send) and components/PdfPreview.tsx (the on-screen preview),
// so what you see before sending is exactly what goes out.

import { formatCurrency } from "./format";

interface EmailFields {
  supplierNo: string;
  reportDate: string | null;
  computedTotal: number;
}

export function buildEmailSubject(item: EmailFields): string {
  return `Remittance Advice - Supplier No ${item.supplierNo}${item.reportDate ? ` - ${item.reportDate}` : ""}`;
}

export function buildEmailBody(item: EmailFields): string {
  return [
    `Dear Supplier,`,
    ``,
    `Please find attached your remittance advice from Cummins South Pacific Pty. Ltd.`,
    ``,
    `Supplier no: ${item.supplierNo}`,
    `Date: ${item.reportDate ?? "-"}`,
    `Total this Debit: ${formatCurrency(item.computedTotal)}`,
    ``,
    `This is a system-generated email. If you have any queries, please contact cbs.ap.au@cummins.com.`,
    ``,
    `Regards,`,
    `Accounts Payable`,
  ].join("\n");
}

// Pure string builder, no server-only imports — shared by lib/mailer.ts (SMTP
// attachment name), lib/eml.ts (.eml attachment + the .eml file itself),
// components/PdfPreview.tsx (on-screen preview), and RunProvider's download
// fallback, so the PDF/.eml filename is identical everywhere it's built.
//
// Format: <country>_<supplier no>_<d[d]><short month><2-digit year>, e.g.
// "AU_11345_16Sep26" / "NZ_11345_16Sep26" — reportDate comes off the bank
// export as "dd/mm/yy" (see lib/bankParser.ts's DATE_LINE).

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatFileDate(reportDate: string | null): string {
  const match = reportDate?.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!match) return "NoDate";
  const [, day, monthNum, year] = match;
  const month = MONTH_ABBR[Number(monthNum) - 1];
  if (!month) return "NoDate";
  return `${day}${month}${year!.slice(-2)}`;
}

interface FilenameFields {
  supplierNo: string;
  countryCode: string | null;
  reportDate: string | null;
}

export function buildRemittanceFilename(item: FilenameFields): string {
  const country = (item.countryCode ?? "").trim().toUpperCase() === "NZ" ? "NZ" : "AU";
  return `${country}_${item.supplierNo}_${formatFileDate(item.reportDate)}`;
}

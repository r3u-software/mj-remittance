import type { InvoiceLine, ParseWarning, SupplierBlock } from "./types";

const SUPPLIER_LINE = /^(.+?)\s*Supplier no\s*:\s*(\d+)\s*$/;
const DATE_LINE = /^Date\s*:\s*(\d{2}\/\d{2}\/\d{2,4})/;
const TABLE_HEADER_LINE = /^Inv\.Date\s+Inv\.Ref\.No\./;
const CONTINUED_LINE = /Continued next page/i;
const TOTAL_LINE = /Total this Debit\s*:\s*([\d,]+\.\d{2}-?)/i;

type State = "idle" | "address" | "seekHeader" | "rows";

/**
 * Parses the bank's paginated, fixed-width "Direct Debit Advice" / EFT
 * remittance detail export. The file is UTF-16LE, not CSV — see
 * CLAUDE.md for the format's shape. Long supplier blocks repeat their
 * header on each continuation page; a block only truly ends at its
 * "Total this Debit :" line.
 */
export function parseBankExport(buffer: Buffer): {
  blocks: SupplierBlock[];
  warnings: ParseWarning[];
} {
  const text = decodeUtf16le(buffer);
  const lines = text.split(/\r?\n/);

  const blocks: SupplierBlock[] = [];
  const warnings: ParseWarning[] = [];

  let current: SupplierBlock | null = null;
  let state: State = "idle";

  const closeCurrent = (statedTotal: number | null) => {
    if (!current) return;
    current.statedTotal = statedTotal;
    blocks.push(current);
    current = null;
    state = "idle";
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (state === "rows") {
        // Blank line inside a supplier's table — legacy report uses
        // this as a soft row separator on some pages, not a block
        // terminator, so just skip it and keep collecting rows.
      }
      continue;
    }

    const supplierMatch = trimmed.match(SUPPLIER_LINE);
    if (supplierMatch) {
      const name = supplierMatch[1]!.trim();
      const no = supplierMatch[2]!.trim();

      if (current && current.supplierNo !== no) {
        // Malformed/unexpected input: a new supplier header appeared
        // before the previous block's "Total this Debit" line. Close
        // the previous block as-is (flagged via null statedTotal,
        // which the matcher surfaces as a total mismatch) rather than
        // losing or silently merging data.
        warnings.push({
          supplierNo: current.supplierNo,
          message: `Block for supplier ${current.supplierNo} ended without a "Total this Debit" line before supplier ${no} started.`,
        });
        closeCurrent(null);
      }

      if (!current) {
        current = {
          supplierNo: no,
          supplierName: name,
          addressLines: [],
          reportDate: null,
          invoices: [],
          statedTotal: null,
        };
        state = "address";
      } else {
        // Continuation page of the same open block — discard the
        // repeated header/address, keep accumulating invoice rows.
        state = "address";
      }
      continue;
    }

    const dateMatch = trimmed.match(DATE_LINE);
    if (dateMatch && (state === "address" || state === "idle")) {
      if (current && !current.reportDate) {
        current.reportDate = dateMatch[1]!;
      }
      state = "seekHeader";
      continue;
    }

    if (TABLE_HEADER_LINE.test(trimmed) && (state === "seekHeader" || state === "address")) {
      state = "rows";
      continue;
    }

    if (CONTINUED_LINE.test(trimmed)) {
      state = "idle";
      continue;
    }

    const totalMatch = trimmed.match(TOTAL_LINE);
    if (totalMatch) {
      const total = parseSignedAmount(totalMatch[1]!);
      closeCurrent(Number.isFinite(total) ? total : null);
      continue;
    }

    if (state === "address" && current) {
      // Only the first page of a block carries the real address —
      // continuation pages repeat it verbatim, so once this block has
      // already collected invoice rows, treat further "address" lines
      // as repeated noise rather than appending duplicates.
      if (current.invoices.length === 0) {
        current.addressLines.push(trimmed);
      }
      continue;
    }

    if (state === "rows" && current) {
      const invoice = parseInvoiceRow(trimmed);
      if (invoice) {
        current.invoices.push(invoice);
      } else {
        warnings.push({
          supplierNo: current.supplierNo,
          message: `Could not parse invoice row: "${trimmed}"`,
        });
      }
      continue;
    }

    // Anything else (letterhead boilerplate, page numbers, blank-ish
    // noise) is intentionally ignored.
  }

  if (current) {
    warnings.push({
      supplierNo: current.supplierNo,
      message: `File ended mid-block for supplier ${current.supplierNo} (no "Total this Debit" line found).`,
    });
    closeCurrent(null);
  }

  return { blocks, warnings };
}

function parseInvoiceRow(line: string): InvoiceLine | null {
  const tokens = line.split(/\s{2,}/).filter(Boolean);
  if (tokens.length < 3) return null;

  const invDate = tokens[0]!;
  const invRefNo = tokens[1]!;
  const nettAmount = parseSignedAmount(tokens[tokens.length - 1]!);

  if (!/^\d{2}\/\d{2}\/\d{2,4}$/.test(invDate)) return null;
  if (!Number.isFinite(nettAmount)) return null;

  return { invDate, invRefNo, nettAmount };
}

// This SAP-style report writes negative amounts with a *trailing*
// minus sign ("680780.74-"), not a leading one — a common
// mainframe/COBOL convention for credits and reversals.
// JavaScript's parseFloat only recognizes a leading "-" and silently
// drops a trailing one, reading the value as positive; a $680,780.74
// reversal in real data got added instead of subtracted this way,
// throwing a supplier's total off by 2x that amount. Strip and negate
// explicitly instead of relying on parseFloat's own sign handling.
function parseSignedAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, "");
  const isNegative = cleaned.endsWith("-");
  const numeric = isNegative ? cleaned.slice(0, -1) : cleaned;
  const value = parseFloat(numeric);
  return isNegative ? -value : value;
}

function decodeUtf16le(buffer: Buffer): string {
  let start = 0;
  // Strip a UTF-16LE BOM (FF FE) if present.
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    start = 2;
  }
  return buffer.toString("utf16le", start);
}

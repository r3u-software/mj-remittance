import type { EmailStatus, LookupRow, MatchedSupplier, SupplierBlock } from "./types";

const TOTAL_TOLERANCE = 0.01;

export function matchSuppliers(
  blocks: SupplierBlock[],
  lookup: LookupRow[]
): Omit<MatchedSupplier, "pdfBase64">[] {
  const lookupByNo = new Map(lookup.map((row) => [row.supplierNo, row]));

  return blocks.map((block) => {
    const computedTotal = round2(
      block.invoices.reduce((sum, inv) => sum + inv.nettAmount, 0)
    );
    const totalMismatch =
      block.statedTotal === null ||
      Math.abs(computedTotal - block.statedTotal) > TOTAL_TOLERANCE;

    const lookupRow = lookupByNo.get(block.supplierNo) ?? null;
    const emailStatus: EmailStatus = !lookupRow
      ? "not-found"
      : lookupRow.status === "Valid" && lookupRow.email
        ? "valid"
        : "invalid";

    return {
      supplierNo: block.supplierNo,
      supplierName: block.supplierName,
      lookupSupplierName: lookupRow?.supplierName ?? null,
      addressLines: block.addressLines,
      reportDate: block.reportDate,
      invoices: block.invoices,
      statedTotal: block.statedTotal,
      computedTotal,
      totalMismatch,
      email: lookupRow?.email ?? null,
      emailStatus,
    };
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

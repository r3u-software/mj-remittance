import * as XLSX from "xlsx";
import type { LookupRow } from "./types";

/**
 * Parses the supplier email lookup workbook (the "Movex file"). Column
 * order isn't guaranteed, so this matches by header name rather than
 * position.
 *
 * AU and NZ exports don't have the same columns: AU has both `IDSUNO`
 * (always blank) and `IDSUNO.1` (the real supplier number — a
 * duplicate-header artifact from whatever upstream tool produced it),
 * plus a `Status` column (`Valid`/`Empty`). NZ has neither extra
 * column — just a single `IDSUNO` holding the real number, and no
 * `Status` at all. Handle both rather than assuming one: the
 * `IDSUNO.1 ?? IDSUNO` fallback covers the join key either way, and
 * `hasStatusColumn` (checked once against the header row, not
 * per-cell — a missing *column* is different from a row whose
 * `Status` cell happens to be blank) covers validity either way.
 * Expected headers otherwise: IDSUNM (name), IDCSCD (country), IDPHNO
 * (phone), CBEMAL (email).
 */
export function parseLookupWorkbook(buffer: Buffer): LookupRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [];

  const headerRow = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })[0] ?? [];
  const hasStatusColumn = headerRow.some((h) => String(h).trim() === "Status");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  return rows
    .map((row): LookupRow | null => {
      const supplierNoRaw = row["IDSUNO.1"] ?? row["IDSUNO"];
      if (supplierNoRaw === null || supplierNoRaw === undefined) return null;
      const supplierNo = String(supplierNoRaw).trim();
      if (!supplierNo) return null;

      const emailRaw = row["CBEMAL"];
      const email =
        typeof emailRaw === "string" && emailRaw.trim() ? emailRaw.trim() : null;

      // No Status column at all (NZ) -> nothing to disqualify a row on
      // besides whether it has an email, so report "Valid" and let
      // lib/match.ts's existing `status === "Valid" && email` check
      // fall through to exactly that. A real blank Status cell in a
      // file that *does* have the column (AU's "Empty") still comes
      // through as "" below, correctly marking that row invalid.
      const status = hasStatusColumn ? String(row["Status"] ?? "").trim() : "Valid";

      return {
        supplierNo,
        supplierName: String(row["IDSUNM"] ?? "").trim(),
        countryCode: String(row["IDCSCD"] ?? "").trim(),
        phone: String(row["IDPHNO"] ?? "").trim(),
        email,
        status,
      };
    })
    .filter((row): row is LookupRow => row !== null);
}

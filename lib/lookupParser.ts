import * as XLSX from "xlsx";
import type { LookupRow } from "./types";

/**
 * Parses the supplier email lookup workbook (the "Movex file"). Column
 * order isn't guaranteed, so this matches by header name rather than
 * position. Expected headers: IDSUNO.1 (supplier no, the join key),
 * IDSUNM (name), IDCSCD (country), IDPHNO (phone), CBEMAL (email),
 * Status.
 */
export function parseLookupWorkbook(buffer: Buffer): LookupRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [];

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

      return {
        supplierNo,
        supplierName: String(row["IDSUNM"] ?? "").trim(),
        countryCode: String(row["IDCSCD"] ?? "").trim(),
        phone: String(row["IDPHNO"] ?? "").trim(),
        email,
        status: String(row["Status"] ?? "").trim(),
      };
    })
    .filter((row): row is LookupRow => row !== null);
}

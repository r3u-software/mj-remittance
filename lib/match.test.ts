import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseBankExport } from "./bankParser";
import { parseLookupWorkbook } from "./lookupParser";
import { matchSuppliers } from "./match";

const fixturesDir = path.join(process.cwd(), "fixtures");

describe("matchSuppliers", () => {
  const { blocks } = parseBankExport(fs.readFileSync(path.join(fixturesDir, "sample-bank-export.txt")));
  const lookup = parseLookupWorkbook(fs.readFileSync(path.join(fixturesDir, "sample-supplier-lookup.xlsx")));
  const matched = matchSuppliers(blocks, lookup);

  it("marks a supplier with a valid lookup email as valid", () => {
    const acme = matched.find((s) => s.supplierNo === "90001")!;
    expect(acme.emailStatus).toBe("valid");
    expect(acme.email).toBe("ap@acmewidgets.example.com");
  });

  it("marks a supplier with Status=Empty / no email as invalid", () => {
    const noEmail = matched.find((s) => s.supplierNo === "90003")!;
    expect(noEmail.emailStatus).toBe("invalid");
    expect(noEmail.email).toBeNull();
  });

  it("marks a supplier missing from the lookup entirely as not-found", () => {
    const ghost = matched.find((s) => s.supplierNo === "90004")!;
    expect(ghost.emailStatus).toBe("not-found");
  });

  it("computes totals that match the source file's stated total", () => {
    for (const s of matched) {
      expect(s.totalMismatch).toBe(false);
      expect(s.computedTotal).toBe(s.statedTotal);
    }
  });

  it("carries the lookup file's country code through, for the PDF's AU/NZ letterhead choice", () => {
    const au = matched.find((s) => s.supplierNo === "90001")!;
    const nz = matched.find((s) => s.supplierNo === "90006")!;
    expect(au.countryCode).toBe("AU");
    expect(nz.countryCode).toBe("NZ");
  });
});

describe("matchSuppliers against a real NZ-layout lookup file (no IDSUNO.1, no Status)", () => {
  it("still resolves a supplier with an email to valid, end to end", () => {
    const { blocks } = parseBankExport(fs.readFileSync(path.join(fixturesDir, "sample-bank-export.txt")));
    const lookup = parseLookupWorkbook(fs.readFileSync(path.join(fixturesDir, "sample-supplier-lookup-nz.xlsx")));
    const matched = matchSuppliers(blocks, lookup);

    const kiwi = matched.find((s) => s.supplierNo === "90006")!;
    expect(kiwi.emailStatus).toBe("valid");
    expect(kiwi.email).toBe("accounts@kiwiservices.example.co.nz");
  });
});

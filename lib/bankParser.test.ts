import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseBankExport } from "./bankParser";

const fixturePath = path.join(process.cwd(), "fixtures", "sample-bank-export.txt");

describe("parseBankExport", () => {
  const buffer = fs.readFileSync(fixturePath);
  const { blocks, warnings } = parseBankExport(buffer);

  it("finds every supplier block", () => {
    expect(blocks.map((b) => b.supplierNo)).toEqual(["90001", "90002", "90003", "90004", "90005", "90006"]);
  });

  it("parses a single-page block's invoices and total", () => {
    const acme = blocks.find((b) => b.supplierNo === "90001")!;
    expect(acme.supplierName).toBe("ACME WIDGETS PTY LTD");
    expect(acme.invoices).toEqual([
      { invDate: "01/09/26", invRefNo: "9000111111", nettAmount: 100.0 },
      { invDate: "05/09/26", invRefNo: "9000122222", nettAmount: 250.5 },
    ]);
    expect(acme.statedTotal).toBe(350.5);
    expect(acme.addressLines).toEqual(["1 TEST STREET", "SAMPLE VIC 3000"]);
  });

  it("concatenates invoice rows across a continuation page without duplicating the address", () => {
    const big = blocks.find((b) => b.supplierNo === "90002")!;
    expect(big.invoices).toHaveLength(3);
    expect(big.invoices.map((i) => i.invRefNo)).toEqual(["9000211111", "9000222222", "9000233333"]);
    expect(big.statedTotal).toBe(60.0);
    expect(big.addressLines).toEqual(["2 TEST STREET", "SAMPLE VIC 3000"]);
  });

  it("produces no warnings for well-formed input", () => {
    expect(warnings).toEqual([]);
  });

  it("reads a trailing-minus amount as negative, not positive", () => {
    // Regression test for real production data: supplier 10043 had a
    // "680780.74-" reversal line that parseFloat alone reads as a
    // positive 680780.74 (it only recognizes a *leading* minus), which
    // inflated that supplier's total by 2x the reversal amount instead
    // of netting it out.
    const negAdj = blocks.find((b) => b.supplierNo === "90005")!;
    expect(negAdj.invoices).toEqual([
      { invDate: "08/09/26", invRefNo: "9000511111", nettAmount: 500.0 },
      { invDate: "09/09/26", invRefNo: "9000522222", nettAmount: -50.0 },
    ]);
    expect(negAdj.statedTotal).toBe(450.0);
  });
});

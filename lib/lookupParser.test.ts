import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseLookupWorkbook } from "./lookupParser";

const fixturesDir = path.join(process.cwd(), "fixtures");

describe("parseLookupWorkbook", () => {
  it("reads the AU column layout (IDSUNO.1 join key, a real Status column)", () => {
    const rows = parseLookupWorkbook(fs.readFileSync(path.join(fixturesDir, "sample-supplier-lookup.xlsx")));
    const acme = rows.find((r) => r.supplierNo === "90001")!;
    expect(acme.email).toBe("ap@acmewidgets.example.com");
    expect(acme.status).toBe("Valid");

    const noEmail = rows.find((r) => r.supplierNo === "90003")!;
    expect(noEmail.status).toBe("Empty");
  });

  it("reads the NZ column layout (plain IDSUNO join key, no Status column)", () => {
    // Regression test: NZ files don't have IDSUNO.1 or Status at all
    // (unlike AU). Before this, a missing Status column made every NZ
    // row's status "" (never equal to "Valid"), silently marking every
    // NZ supplier unsendable regardless of a perfectly good email.
    const rows = parseLookupWorkbook(fs.readFileSync(path.join(fixturesDir, "sample-supplier-lookup-nz.xlsx")));
    expect(rows).toHaveLength(2);

    const kiwi = rows.find((r) => r.supplierNo === "90006")!;
    expect(kiwi.email).toBe("accounts@kiwiservices.example.co.nz");
    // No Status column in the file, but this must still resolve to a
    // sendable row purely because it has an email.
    expect(kiwi.status).toBe("Valid");

    const noEmail = rows.find((r) => r.supplierNo === "90008")!;
    expect(noEmail.email).toBeNull();
    // Status still reports "Valid" (no column to say otherwise) — it's
    // lib/match.ts's `status === "Valid" && email` check, not this
    // parser, that correctly still marks this one unsendable on the
    // missing email alone.
    expect(noEmail.status).toBe("Valid");
  });
});

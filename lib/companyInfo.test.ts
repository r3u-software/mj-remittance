import { describe, expect, it } from "vitest";
import { getCompanyProfile } from "./companyInfo";

describe("getCompanyProfile", () => {
  it("selects the NZ profile for an NZ country code", () => {
    const profile = getCompanyProfile("NZ");
    expect(profile.name).toBe("Cummins New Zealand Limited");
    expect(profile.abn).toBeUndefined();
    expect(profile.totalLabel).toBe("Total :");
  });

  it("selects the AU profile for an AU country code", () => {
    const profile = getCompanyProfile("AU");
    expect(profile.name).toBe("Cummins South Pacific Pty. Ltd.");
    expect(profile.abn).toBe("42006332949");
    expect(profile.totalLabel).toBe("Total this Debit :");
  });

  it("falls back to AU for null, unknown, or blank country codes", () => {
    expect(getCompanyProfile(null).name).toBe("Cummins South Pacific Pty. Ltd.");
    expect(getCompanyProfile("").name).toBe("Cummins South Pacific Pty. Ltd.");
    expect(getCompanyProfile("US").name).toBe("Cummins South Pacific Pty. Ltd.");
  });

  it("is case-insensitive", () => {
    expect(getCompanyProfile("nz").name).toBe("Cummins New Zealand Limited");
  });

  it("uses a country-specific register/query email, not a shared AU one, in both the PDF promo box and its text", () => {
    const au = getCompanyProfile("AU");
    const nz = getCompanyProfile("NZ");
    expect(au.registerEmail).toBe("cbs.ap.au@cummins.com");
    expect(nz.registerEmail).toBe("cbs.ap.nz@cummins.com");
    expect(au.registerPromoText).toContain("cbs.ap.au@cummins.com");
    expect(nz.registerPromoText).toContain("cbs.ap.nz@cummins.com");
    expect(nz.registerPromoText).not.toContain("cbs.ap.au@cummins.com");
  });
});

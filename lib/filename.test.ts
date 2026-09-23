import { describe, expect, it } from "vitest";
import { buildRemittanceFilename } from "./filename";

describe("buildRemittanceFilename", () => {
  it("builds AU country + supplier no + d-MMM-yy date, each underscore-separated", () => {
    expect(buildRemittanceFilename({ supplierNo: "11345", countryCode: "AU", reportDate: "16/09/26" })).toBe(
      "AU_11345_16Sep26"
    );
  });

  it("builds NZ the same way", () => {
    expect(buildRemittanceFilename({ supplierNo: "11345", countryCode: "NZ", reportDate: "16/09/26" })).toBe(
      "NZ_11345_16Sep26"
    );
  });

  it("defaults to AU when countryCode is null or unrecognized, matching the PDF letterhead's own default", () => {
    expect(buildRemittanceFilename({ supplierNo: "90004", countryCode: null, reportDate: "01/01/26" })).toBe(
      "AU_90004_01Jan26"
    );
  });

  it("falls back to NoDate rather than throwing when reportDate is missing or malformed", () => {
    expect(buildRemittanceFilename({ supplierNo: "90004", countryCode: "AU", reportDate: null })).toBe(
      "AU_90004_NoDate"
    );
  });
});

// Sender letterhead details — the company's own public letterhead info
// (address, phone/fax are printed on every outgoing remittance advice
// already), not confidential. Safe to hardcode; edit here if a
// company's details change.
//
// Two profiles because the AU and NZ remittance advices are genuinely
// different letterheads (different legal entity name, no ABN on the
// NZ one, different phone/fax labels, and NZ's total line reads
// "Total :" not "Total this Debit :") — not just a copy with a new
// logo. Selected per supplier via the lookup file's IDCSCD country
// code (see lib/match.ts / MatchedSupplier.countryCode). AU is the
// fallback for anything not explicitly NZ, since that's the
// overwhelming majority of real data seen so far.
export interface CompanyProfile {
  name: string;
  subName?: string;
  abn?: string;
  addressLines: string[];
  phoneLabel: string;
  phone: string;
  faxLabel: string;
  fax: string;
  registerEmail: string;
  registerPromoText: string;
  totalLabel: string;
  logoPath: string;
}

const SHARED_LOGO_PATH = "public/cummins-logo.png";
const AU_REGISTER_EMAIL = "cbs.ap.au@cummins.com";
const NZ_REGISTER_EMAIL = "cbs.ap.nz@cummins.com";
const promoText = (email: string) =>
  `This remittance advice has been sent to your registered email address. If you would like to request an update, please email ${email} and include a signed request on your company letterhead.`;

export const COMPANY_PROFILES = {
  AU: {
    name: "Cummins South Pacific Pty. Ltd.",
    abn: "42006332949",
    addressLines: ["2 Caribbean Drive", "Scoresby Vic"],
    phoneLabel: "Phone :",
    phone: "+61 3 9765 3222",
    faxLabel: "Fax no:",
    fax: "+61 3 9763 0079",
    registerEmail: AU_REGISTER_EMAIL,
    registerPromoText: promoText(AU_REGISTER_EMAIL),
    totalLabel: "Total this Debit :",
    logoPath: SHARED_LOGO_PATH,
  },
  NZ: {
    name: "Cummins New Zealand Limited",
    subName: "Cummins South Pacific Pty Ltd,",
    // No ABN line for NZ — matches the real sample, which shows no tax ID at all.
    addressLines: ["NZ Regional Office:9 Langely Road,", "Manukau City, Auckland, New Zealand,", "Private Bag 94-004, S.A.M.C 2241"],
    phoneLabel: "Telephone:",
    phone: "(09) 2771 000",
    faxLabel: "Fax:",
    fax: "(09) 2771 001",
    registerEmail: NZ_REGISTER_EMAIL,
    registerPromoText: promoText(NZ_REGISTER_EMAIL),
    totalLabel: "Total :",
    logoPath: SHARED_LOGO_PATH,
  },
} satisfies Record<string, CompanyProfile>;

const DEFAULT_COUNTRY: keyof typeof COMPANY_PROFILES = "AU";

export function getCompanyProfile(countryCode: string | null | undefined): CompanyProfile {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (code === "AU" || code === "NZ") return COMPANY_PROFILES[code];
  return COMPANY_PROFILES[DEFAULT_COUNTRY];
}

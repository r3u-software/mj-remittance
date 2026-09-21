// Sender letterhead details — the company's own public letterhead info
// (ABN, address, phone/fax are printed on every outgoing remittance
// advice already), not confidential. Safe to hardcode; edit here if
// the company's details change.
export const COMPANY = {
  name: "Cummins South Pacific Pty. Ltd.",
  abn: "42006332949",
  addressLines: ["2 Caribbean Drive", "Scoresby Vic"],
  phone: "+61 3 9765 3222",
  fax: "+61 3 9763 0079",
  registerEmail: "cbs.ap.au@cummins.com",
  registerPromoText:
    "This remittance advice has been sent to your registered email address. If you would like to request an update, please email cbs.ap.au@cummins.com and include a signed request on your company letterhead.",
  logoPath: "public/cummins-logo.png",
};

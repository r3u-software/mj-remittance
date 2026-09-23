export interface InvoiceLine {
  invDate: string;
  invRefNo: string;
  nettAmount: number;
}

export interface ParseWarning {
  supplierNo: string | null;
  message: string;
}

export interface SupplierBlock {
  supplierNo: string;
  supplierName: string;
  addressLines: string[];
  reportDate: string | null;
  invoices: InvoiceLine[];
  statedTotal: number | null;
}

export interface LookupRow {
  supplierNo: string;
  supplierName: string;
  countryCode: string;
  phone: string;
  email: string | null;
  status: string;
}

export type EmailStatus = "valid" | "invalid" | "not-found";

export interface MatchedSupplier {
  supplierNo: string;
  supplierName: string;
  lookupSupplierName: string | null;
  countryCode: string | null;
  addressLines: string[];
  reportDate: string | null;
  invoices: InvoiceLine[];
  statedTotal: number | null;
  computedTotal: number;
  totalMismatch: boolean;
  email: string | null;
  emailStatus: EmailStatus;
  pdfBase64: string;
}

export interface ParseResult {
  suppliers: MatchedSupplier[];
  warnings: ParseWarning[];
}

export interface SendRequestItem {
  supplierNo: string;
  supplierName: string;
  email: string;
  countryCode: string | null;
  reportDate: string | null;
  statedTotal: number | null;
  computedTotal: number;
  pdfBase64: string;
}

export type SendStatus = "sent" | "dry-run" | "failed";

export interface SendResultItem {
  supplierNo: string;
  email: string;
  status: SendStatus;
  error?: string;
}

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import fs from "node:fs";
import type { MatchedSupplier } from "./types";
import { getCompanyProfile } from "./companyInfo";
import { formatCurrency } from "./format";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  logo: { width: 110, height: 45, objectFit: "contain" },
  companyBlock: { alignItems: "flex-end", textAlign: "right" },
  companyName: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  label: { fontWeight: 700 },
  addressBlock: { marginTop: 8 },
  promoBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#333",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
    fontSize: 8,
  },
  table: { marginTop: 8 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  colDate: { width: "20%" },
  colInvoice: { width: "30%" },
  colDescription: { width: "30%" },
  colAmount: { width: "20%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  totalLabel: { fontWeight: 700, marginRight: 12 },
  totalValue: { fontWeight: 700, width: "20%", textAlign: "right" },
  mismatchNote: { marginTop: 4, fontSize: 8, color: "#b00020" },
});

// @react-pdf/renderer's <Image src> treats a plain path string as a URL
// to fetch first, which fails for local files under Next's dev server —
// a base64 data URI sidesteps that resolution entirely.
const logoPath = path.join(process.cwd(), "public", "cummins-logo.png");
const logoDataUri = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

export function RemittanceDocument({ supplier }: { supplier: MatchedSupplier }) {
  const company = getCompanyProfile(supplier.countryCode);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- this is @react-pdf/renderer's Image (a PDF drawing primitive), not an HTML img */}
          <Image src={logoDataUri} style={styles.logo} />
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.subName && <Text>{company.subName}</Text>}
            {company.abn && <Text>ABN {company.abn}</Text>}
            {company.addressLines.map((line) => (
              <Text key={line}>{line}</Text>
            ))}
            <Text>
              {company.phoneLabel} {company.phone}
            </Text>
            <Text>
              {company.faxLabel} {company.fax}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View>
            <Text>
              <Text style={styles.label}>Supplier no: </Text>
              {supplier.supplierNo}
            </Text>
          </View>
          <View>
            <Text>
              <Text style={styles.label}>Date: </Text>
              {supplier.reportDate ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.addressBlock}>
          <Text>{supplier.supplierName}</Text>
          {supplier.addressLines.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </View>

        <View style={styles.promoBox}>
          <Text>{company.registerPromoText}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDate, styles.label]}>Invoice Date</Text>
            <Text style={[styles.colInvoice, styles.label]}>Invoice Number</Text>
            <Text style={[styles.colDescription, styles.label]}>Description</Text>
            <Text style={[styles.colAmount, styles.label]}>Nett Amount</Text>
          </View>
          {supplier.invoices.map((inv, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colDate}>{inv.invDate}</Text>
              <Text style={styles.colInvoice}>{inv.invRefNo}</Text>
              <Text style={styles.colDescription}></Text>
              <Text style={styles.colAmount}>{formatCurrency(inv.nettAmount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{company.totalLabel}</Text>
          <Text style={styles.totalValue}>{formatCurrency(supplier.computedTotal)}</Text>
        </View>
        {supplier.totalMismatch && (
          <Text style={styles.mismatchNote}>
            Warning: computed total does not match the source file&apos;s stated
            total ({supplier.statedTotal !== null ? formatCurrency(supplier.statedTotal) : "missing"}). Verify before sending.
          </Text>
        )}
      </Page>
    </Document>
  );
}

export async function renderSupplierPdf(supplier: MatchedSupplier): Promise<Buffer> {
  return renderToBuffer(<RemittanceDocument supplier={supplier} />);
}

"use client";

import { useMemo } from "react";
import { useRun } from "@/components/RunProvider";
import { buildEmailBody, buildEmailSubject } from "@/lib/emailTemplate";
import { buildRemittanceFilename } from "@/lib/filename";

export function PdfPreview() {
  const { suppliers, previewSupplierNo } = useRun();
  const supplier = useMemo(
    () => suppliers.find((s) => s.supplierNo === previewSupplierNo) ?? null,
    [suppliers, previewSupplierNo]
  );

  if (!supplier) {
    return (
      <div className="panel empty" style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <div className="big">📄</div>
          Select &quot;Preview&quot; on a supplier to see its PDF and email preview here.
        </div>
      </div>
    );
  }

  const dataUrl = `data:application/pdf;base64,${supplier.pdfBase64}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="panel">
        <h3>✉️ Email preview</h3>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", rowGap: 4, fontSize: 12.5 }}>
          <div style={{ color: "var(--muted)" }}>To</div>
          <div>{supplier.email ?? <span style={{ color: "#dc2626" }}>no valid email</span>}</div>
          <div style={{ color: "var(--muted)" }}>Subject</div>
          <div>{buildEmailSubject(supplier)}</div>
          <div style={{ color: "var(--muted)" }}>Attachment</div>
          <div>{buildRemittanceFilename(supplier)}.pdf</div>
        </div>
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--border)",
            fontSize: 12.5,
            whiteSpace: "pre-wrap",
            color: "var(--text)",
          }}
        >
          {buildEmailBody(supplier)}
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no benefit from next/image here */}
          <img src="/cummins-logo.png" alt="Cummins" width={150} style={{ display: "block", marginTop: 8 }} />
        </div>
      </div>
      <div className="tablewrap" style={{ padding: 0 }}>
        <embed src={dataUrl} type="application/pdf" style={{ height: 600, width: "100%" }} />
      </div>
    </div>
  );
}

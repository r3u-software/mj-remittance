"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { UploadForm } from "@/components/UploadForm";
import { SupplierTable } from "@/components/SupplierTable";
import { PdfPreview } from "@/components/PdfPreview";
import { useRun } from "@/components/RunProvider";

export default function Home() {
  const [smtpSource, setSmtpSource] = useState<"settings" | "env" | "none" | null>(null);
  const { suppliers, warnings, parseError, selected, phase, sendResults, dryRun, sendProgress } = useRun();

  useEffect(() => {
    fetch("/api/settings/smtp")
      .then((r) => r.json())
      .then((body) => setSmtpSource(body.source))
      .catch(() => setSmtpSource(null));
  }, [phase]);

  return (
    <Shell title="Process Remittance" subtitle="Upload, preview, and send this week's remittance advice">
      {smtpSource === "none" && (
        <div className="banner warn" style={{ marginTop: 0, marginBottom: 16 }}>
          SMTP isn&apos;t configured yet — sends will run in dry-run mode (nothing actually goes out).{" "}
          <Link href="/settings" style={{ fontWeight: 600 }}>
            Set it up in Settings →
          </Link>
        </div>
      )}

      <div className="grid2">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <UploadForm />

          {parseError && <div className="banner error">{parseError}</div>}
          {warnings.length > 0 && (
            <details className="banner warn">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {warnings.length} parsing warning{warnings.length === 1 ? "" : "s"}
              </summary>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {warnings.map((w, i) => (
                  <li key={i}>
                    {w.supplierNo ? `[${w.supplierNo}] ` : ""}
                    {w.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {phase === "sending" && sendProgress && (
            <div className="panel">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8, fontSize: 12.5 }}>
                <span>
                  Sending {sendProgress.current} of {sendProgress.total} — {sendProgress.supplierName}
                </span>
                <span>{Math.round((sendProgress.current / sendProgress.total) * 100)}%</span>
              </div>
              <div className="load-track">
                <div
                  className="load-bar"
                  style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {suppliers.length > 0 && (
            <>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} · {selected.size} selected
              </span>
              <SupplierTable />
            </>
          )}

          {sendResults && (
            <div className="panel">
              <h3>{dryRun ? "🧪 Dry run (no SMTP configured yet)" : "✅ Send results"}</h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, marginTop: 8 }}>
                {sendResults.map((r, i) => (
                  <li key={i} className="row" style={{ justifyContent: "space-between" }}>
                    <span>
                      {r.supplierNo} — {r.email}
                    </span>
                    <span className={`tag ${r.status === "failed" ? "failed" : r.status === "dry-run" ? "dryrun" : "sent"}`}>
                      {r.status}
                      {r.error ? `: ${r.error}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <PdfPreview />
      </div>
    </Shell>
  );
}

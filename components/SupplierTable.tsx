"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MatchedSupplier, SendResultItem } from "@/lib/types";
import { useRun } from "@/components/RunProvider";
import { formatCurrency } from "@/lib/format";

export function SupplierTable() {
  const {
    suppliers,
    selected,
    toggleSupplier,
    toggleAllValid,
    previewSupplierNo,
    setPreviewSupplierNo,
    sendOne,
    sendingRow,
    rowResults,
  } = useRun();

  // Sendable = has a valid email — the grayed-out/disabled rows (no
  // email, not in lookup) never get selected by "select all", common
  // sense since there's nowhere to send them.
  const sendableNos = useMemo(
    () => suppliers.filter((s) => s.emailStatus === "valid").map((s) => s.supplierNo),
    [suppliers]
  );
  const allSelected = sendableNos.length > 0 && sendableNos.every((no) => selected.has(no));
  const someSelected = sendableNos.some((no) => selected.has(no));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleAllValid}
                aria-label="Select all valid"
              />
            </th>
            <th>Supplier</th>
            <th>No.</th>
            <th>Email</th>
            <th style={{ textAlign: "right" }}>Total</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => {
            const canSend = s.emailStatus === "valid";
            const isSendingThisRow = sendingRow === s.supplierNo;
            const rowResult = rowResults[s.supplierNo];
            return (
              <tr key={s.supplierNo} className={previewSupplierNo === s.supplierNo ? "highlight" : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(s.supplierNo)}
                    disabled={!canSend}
                    onChange={() => toggleSupplier(s.supplierNo)}
                  />
                </td>
                <td>{s.supplierName}</td>
                <td style={{ fontFamily: "monospace", fontSize: 11.5 }}>{s.supplierNo}</td>
                <td style={{ fontSize: 11.5 }}>{s.email ?? "—"}</td>
                <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                  {formatCurrency(s.computedTotal)}
                  {s.totalMismatch && (
                    <span style={{ marginLeft: 4, color: "#dc2626" }} title="Computed total does not match source file">
                      ⚠
                    </span>
                  )}
                </td>
                <td>
                  <StatusTag status={s.emailStatus} />
                </td>
                <td>
                  <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <button className="btn ghost sm" onClick={() => setPreviewSupplierNo(s.supplierNo)}>
                      Preview
                    </button>
                    <button
                      className="btn sm"
                      disabled={!canSend || isSendingThisRow}
                      onClick={() => sendOne(s.supplierNo)}
                      title={canSend ? "Send just this one" : "No valid email"}
                    >
                      {isSendingThisRow ? "Sending…" : "Send"}
                    </button>
                    {rowResult && <RowResultTag result={rowResult} />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusTag({ status }: { status: MatchedSupplier["emailStatus"] }) {
  const cls = { valid: "valid", invalid: "invalid", "not-found": "notfound" } as const;
  const labels = { valid: "Valid", invalid: "No valid email", "not-found": "Not in lookup" } as const;
  return <span className={`tag ${cls[status]}`}>{labels[status]}</span>;
}

function RowResultTag({ result }: { result: SendResultItem }) {
  const cls = result.status === "failed" ? "failed" : result.status === "dry-run" ? "dryrun" : "sent";
  return (
    <span className={`tag ${cls}`} title={result.error}>
      {result.status}
    </span>
  );
}

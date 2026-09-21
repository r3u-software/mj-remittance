"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { formatCurrency } from "@/lib/format";

interface SendLogEntry {
  id: number;
  runId: string;
  supplierNo: string;
  email: string;
  amount: number;
  status: string;
  error: string | null;
  sentAt: string;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<SendLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((body) => setEntries(body.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell title="Send History" subtitle="Local audit log — every send/dry-run attempt, most recent first">
      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</p>
      ) : entries.length === 0 ? (
        <div className="panel empty">
          <div className="big">🕘</div>
          No runs yet. Once you send (or dry-run) a batch, it&apos;ll show up here.
        </div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Sent at</th>
                <th>Run</th>
                <th>Supplier no.</th>
                <th>Email</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontSize: 11.5 }}>{e.sentAt}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{e.runId.slice(0, 8)}</td>
                  <td style={{ fontFamily: "monospace" }}>{e.supplierNo}</td>
                  <td style={{ fontSize: 11.5 }}>{e.email}</td>
                  <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCurrency(e.amount)}</td>
                  <td>
                    <span className={`tag ${e.status === "failed" ? "failed" : e.status === "dry-run" ? "dryrun" : "sent"}`}>
                      {e.status}
                      {e.error ? `: ${e.error}` : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

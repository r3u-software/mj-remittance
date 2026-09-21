"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { MatchedSupplier, ParseWarning, SendRequestItem, SendResultItem } from "@/lib/types";

/**
 * idle    -> file inputs enabled, button "Match & generate"
 * parsing -> file inputs locked, button "Parsing…"
 * matched -> file inputs locked, button "Confirm & send (N)"
 * sending -> file inputs locked, button "Sending…", progress bar visible
 * Sending completes back to idle (and clears the chosen files) — the
 * suppliers table / results are separate state and are NOT cleared, so
 * the previous run's data stays visible while you start the next one.
 */
type Phase = "idle" | "parsing" | "matched" | "sending";

interface SendProgress {
  current: number;
  total: number;
  supplierName: string;
}

interface RunContextValue {
  bankFile: File | null;
  lookupFile: File | null;
  setBankFile: (f: File | null) => void;
  setLookupFile: (f: File | null) => void;

  phase: Phase;
  filesLocked: boolean;
  suppliers: MatchedSupplier[];
  warnings: ParseWarning[];
  parseError: string | null;

  selected: Set<string>;
  previewSupplierNo: string | null;
  setPreviewSupplierNo: (no: string | null) => void;
  toggleSupplier: (supplierNo: string) => void;
  toggleAllValid: () => void;

  sendResults: SendResultItem[] | null;
  dryRun: boolean;
  sendProgress: SendProgress | null;

  rowResults: Record<string, SendResultItem>;
  sendingRow: string | null;

  downloadingEml: boolean;
  downloadEmlError: string | null;

  matchAndGenerate: () => Promise<void>;
  confirmAndSend: () => Promise<void>;
  sendOne: (supplierNo: string) => Promise<void>;
  downloadEml: () => Promise<void>;
}

const RunContext = createContext<RunContextValue | null>(null);

function toSendItem(s: MatchedSupplier): SendRequestItem {
  return {
    supplierNo: s.supplierNo,
    supplierName: s.supplierName,
    email: s.email!,
    reportDate: s.reportDate,
    statedTotal: s.statedTotal,
    computedTotal: s.computedTotal,
    pdfBase64: s.pdfBase64,
  };
}

async function sendItems(items: SendRequestItem[]): Promise<{ results: SendResultItem[]; dryRun: boolean }> {
  const res = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const body = await res.json();
  if (!res.ok) {
    return {
      results: items.map((i) => ({ supplierNo: i.supplierNo, email: i.email, status: "failed", error: body.error })),
      dryRun: false,
    };
  }
  return body;
}

export function RunProvider({ children }: { children: React.ReactNode }) {
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [lookupFile, setLookupFile] = useState<File | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [suppliers, setSuppliers] = useState<MatchedSupplier[]>([]);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewSupplierNo, setPreviewSupplierNo] = useState<string | null>(null);

  const [sendResults, setSendResults] = useState<SendResultItem[] | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);

  const [rowResults, setRowResults] = useState<Record<string, SendResultItem>>({});
  const [sendingRow, setSendingRow] = useState<string | null>(null);

  const [downloadingEml, setDownloadingEml] = useState(false);
  const [downloadEmlError, setDownloadEmlError] = useState<string | null>(null);

  const toggleSupplier = useCallback((supplierNo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(supplierNo)) next.delete(supplierNo);
      else next.add(supplierNo);
      return next;
    });
  }, []);

  const toggleAllValid = useCallback(() => {
    // Reads `suppliers` from the closure (hence the dependency below)
    // rather than smuggling it out via a setSuppliers updater — that
    // pattern has a side effect (the nested setSelected call), and
    // React's Strict Mode double-invokes updaters in dev specifically
    // to catch that: it ran this twice in a row, so the second call
    // saw "already fully selected" from the first and cleared it right
    // back out. A plain pure updater below doesn't have that problem.
    const validNos = suppliers.filter((s) => s.emailStatus === "valid").map((s) => s.supplierNo);
    setSelected((prev) => (prev.size === validNos.length ? new Set() : new Set(validNos)));
  }, [suppliers]);

  const matchAndGenerate = useCallback(async () => {
    if (!bankFile || !lookupFile) return;
    setParseError(null);
    setSendResults(null);
    setRowResults({});
    setPhase("parsing");
    try {
      const formData = new FormData();
      formData.append("bankFile", bankFile);
      formData.append("lookupFile", lookupFile);

      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Parse failed");

      setSuppliers(body.suppliers);
      setWarnings(body.warnings ?? []);
      setSelected(
        new Set(
          body.suppliers
            .filter((s: MatchedSupplier) => s.emailStatus === "valid")
            .map((s: MatchedSupplier) => s.supplierNo)
        )
      );
      setPreviewSupplierNo(body.suppliers[0]?.supplierNo ?? null);
      setPhase("matched");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }, [bankFile, lookupFile]);

  const confirmAndSend = useCallback(async () => {
    const targets = suppliers.filter((s) => selected.has(s.supplierNo));
    if (targets.length === 0) return;

    setPhase("sending");
    const results: SendResultItem[] = [];
    for (let i = 0; i < targets.length; i++) {
      const supplier = targets[i]!;
      setSendProgress({ current: i + 1, total: targets.length, supplierName: supplier.supplierName });
      const { results: itemResults, dryRun: itemDryRun } = await sendItems([toSendItem(supplier)]);
      results.push(...itemResults);
      setDryRun(itemDryRun);
      setSendResults([...results]);
      setRowResults((prev) => ({ ...prev, [supplier.supplierNo]: itemResults[0]! }));
    }
    setSendProgress(null);
    setPhase("idle");
    setBankFile(null);
    setLookupFile(null);
  }, [suppliers, selected]);

  const sendOne = useCallback(
    async (supplierNo: string) => {
      const supplier = suppliers.find((s) => s.supplierNo === supplierNo);
      if (!supplier || !supplier.email) return;
      setSendingRow(supplierNo);
      try {
        const { results } = await sendItems([toSendItem(supplier)]);
        setRowResults((prev) => ({ ...prev, [supplierNo]: results[0]! }));
      } finally {
        setSendingRow(null);
      }
    },
    [suppliers]
  );

  const downloadEml = useCallback(async () => {
    const targets = suppliers.filter((s) => selected.has(s.supplierNo));
    if (targets.length === 0) return;

    setDownloadingEml(true);
    setDownloadEmlError(null);
    try {
      const res = await fetch("/api/download-eml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: targets.map(toSendItem) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Download failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        (targets.length === 1 ? `${targets[0]!.supplierNo}.eml` : "remittance-emails.zip");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadEmlError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloadingEml(false);
    }
  }, [suppliers, selected]);

  return (
    <RunContext.Provider
      value={{
        bankFile,
        lookupFile,
        setBankFile,
        setLookupFile,
        phase,
        filesLocked: phase !== "idle",
        suppliers,
        warnings,
        parseError,
        selected,
        previewSupplierNo,
        setPreviewSupplierNo,
        toggleSupplier,
        toggleAllValid,
        sendResults,
        dryRun,
        sendProgress,
        rowResults,
        sendingRow,
        downloadingEml,
        downloadEmlError,
        matchAndGenerate,
        confirmAndSend,
        sendOne,
        downloadEml,
      }}
    >
      {children}
    </RunContext.Provider>
  );
}

export function useRun(): RunContextValue {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error("useRun must be used within RunProvider");
  return ctx;
}

"use client";

import { useRun } from "@/components/RunProvider";

export function UploadForm() {
  const {
    bankFile,
    lookupFile,
    setBankFile,
    setLookupFile,
    phase,
    filesLocked,
    matchAndGenerate,
    confirmAndSend,
    selected,
    downloadEml,
    downloadingEml,
    downloadEmlError,
  } = useRun();

  const isMatched = phase === "matched";
  const isParsing = phase === "parsing";
  const isSending = phase === "sending";

  const buttonLabel = isParsing
    ? "Parsing…"
    : isSending
      ? "Sending…"
      : isMatched
        ? `Confirm & send (${selected.size})`
        : "Match & generate";

  const buttonDisabled = isParsing || isSending || (isMatched ? selected.size === 0 : !bankFile || !lookupFile);

  function handleClick() {
    if (isMatched) confirmAndSend();
    else matchAndGenerate();
  }

  return (
    <div className="panel">
      <h3>📤 Upload source files</h3>
      <p className="hint">Both files come from the same weekly EFT payment run.</p>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <FileField
          label="Bank EFT remittance detail (.txt)"
          accept=".txt"
          file={bankFile}
          onChange={setBankFile}
          disabled={filesLocked}
        />
        <FileField
          label="Supplier email lookup (.xlsx)"
          accept=".xlsx,.xls"
          file={lookupFile}
          onChange={setLookupFile}
          disabled={filesLocked}
        />
        {/* Invisible label spacer so this column's button lines up with
            the actual <input> row above, not the row below it — the
            file fields grow a filename caption under the input that
            this column doesn't have, so bottom-alignment would drift. */}
        <div className="field">
          <span className="label" style={{ visibility: "hidden" }}>
            Action
          </span>
          <button className="btn primary" disabled={buttonDisabled} onClick={handleClick}>
            {buttonLabel}
          </button>
        </div>
        {selected.size > 0 && (
          <div className="field">
            <span className="label" style={{ visibility: "hidden" }}>
              Action
            </span>
            <button
              className="btn"
              disabled={downloadingEml}
              onClick={downloadEml}
              title="Download the selected recipients' emails as .eml files, PDF attached — no SMTP needed"
            >
              {downloadingEml ? "Preparing…" : `⬇ Download .eml (${selected.size})`}
            </button>
          </div>
        )}
      </div>
      {downloadEmlError && <div className="banner error">{downloadEmlError}</div>}
    </div>
  );
}

function FileField({
  label,
  accept,
  file,
  onChange,
  disabled,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled: boolean;
}) {
  return (
    <label className={`field ${disabled ? "field-disabled" : ""}`}>
      <span className="label">{label}</span>
      {/* The native <input>'s own "No file chosen" text always resets on
          remount (e.g. navigating away and back) even though the actual
          File object survives in RunProvider's context — browsers won't
          let anything, including React, redisplay a file input's chosen
          name after the fact. So the native text is hidden entirely and
          this file-input-display span — driven by our own persisted
          `file` state — is the only filename UI the user sees. */}
      <div className="file-input-wrap">
        <input
          type="file"
          accept={accept}
          className="file-input-native"
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <span className="file-input-display">
          <span className="file-input-name">{file ? file.name : "No file chosen"}</span>
          <span className="file-input-browse">Browse</span>
        </span>
      </div>
    </label>
  );
}

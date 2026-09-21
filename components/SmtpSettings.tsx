"use client";

import { useEffect, useState } from "react";

interface SmtpGetResponse {
  source: "settings" | "env" | "none";
  host: string;
  port: number;
  user: string;
  from: string;
  hasPassword: boolean;
}

const SOURCE_LABEL: Record<SmtpGetResponse["source"], string> = {
  settings: "Using the settings saved below.",
  env: "Using SMTP_* vars from .env.local (not this form).",
  none: "Not configured yet — sends run in dry-run mode.",
};

export function SmtpSettings() {
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<SmtpGetResponse["source"]>("none");
  const [hasPassword, setHasPassword] = useState(false);

  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/settings/smtp")
      .then((r) => r.json())
      .then((body: SmtpGetResponse) => {
        setSource(body.source);
        setHasPassword(body.hasPassword);
        setHost(body.host);
        setPort(body.port);
        setUser(body.user);
        setFrom(body.from);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, user, pass, from }),
      });
      const body = await res.json();
      setTestResult(body);
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, user, pass, from }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setHasPassword(true);
      setSource("settings");
      setPass("");
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h3>✉️ SMTP</h3>
      <p className="hint">
        Credentials for actually sending remittance emails. Saved to your Windows user profile,
        outside this OneDrive-synced project folder.
      </p>

      {loaded && (
        <div className={`banner ${source === "none" ? "warn" : "info"}`} style={{ marginTop: 0, marginBottom: 12 }}>
          {SOURCE_LABEL[source]}
        </div>
      )}

      <div className="formgrid">
        <label className="field">
          <span className="label">Host</span>
          <input className="inp" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.cummins.com" />
        </label>
        <label className="field">
          <span className="label">Port</span>
          <input
            className="inp"
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            placeholder="587"
          />
        </label>
        <label className="field">
          <span className="label">Username</span>
          <input className="inp" value={user} onChange={(e) => setUser(e.target.value)} placeholder="as01v" />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input
            className="inp"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={hasPassword ? "•••••••• (leave blank to keep current)" : "Password"}
          />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span className="label">From address</span>
          <input
            className="inp"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Cummins South Pacific Accounts Payable <as01v@cummins.com>"
          />
        </label>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={handleTest} disabled={testing || !host || !user}>
          {testing ? "Testing…" : "🔌 Test connection"}
        </button>
        <button className="btn primary" onClick={handleSave} disabled={saving || !host || !user || !from}>
          {saving ? "Saving…" : "💾 Save"}
        </button>
        {savedAt && <span style={{ fontSize: 12, color: "var(--muted)" }}>Saved.</span>}
      </div>

      {testResult && (
        <div className={`banner ${testResult.ok ? "success" : "error"}`}>
          {testResult.ok ? "Connection succeeded." : `Connection failed: ${testResult.error}`}
        </div>
      )}
      {saveError && <div className="banner error">{saveError}</div>}
    </div>
  );
}

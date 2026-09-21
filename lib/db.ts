import path from "node:path";
import fs from "node:fs";

export interface SendLogEntry {
  id: number;
  runId: string;
  supplierNo: string;
  email: string;
  amount: number;
  status: string;
  error: string | null;
  sentAt: string;
}

const dataDir = path.join(process.cwd(), "data");
const logPath = path.join(dataDir, "audit-log.json");

function readAll(): SendLogEntry[] {
  if (!fs.existsSync(logPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(logPath, "utf8"));
  } catch {
    return [];
  }
}

function writeAll(entries: SendLogEntry[]): void {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(entries, null, 2));
}

/**
 * Local, human-readable audit log (a JSON file, not a database — this
 * is a single-user local tool with a modest number of entries per run,
 * so a real DB engine would be overkill and, worse, would need a
 * native build toolchain just to `npm install`).
 */
export function recordSend(entry: {
  runId: string;
  supplierNo: string;
  email: string;
  amount: number;
  status: string;
  error: string | null;
}): void {
  const entries = readAll();
  const nextId = entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 1;
  entries.push({ id: nextId, sentAt: new Date().toISOString(), ...entry });
  writeAll(entries);
}

export function getSendHistory(supplierNo?: string): SendLogEntry[] {
  const entries = readAll().sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const filtered = supplierNo ? entries.filter((e) => e.supplierNo === supplierNo) : entries;
  return filtered.slice(0, 500);
}

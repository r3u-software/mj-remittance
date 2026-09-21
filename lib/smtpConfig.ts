import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

// Deliberately stored under the OS user profile, NOT inside this
// project folder — this folder lives under OneDrive (see CLAUDE.md),
// and an SMTP password saved here would get swept into cloud sync the
// moment it's written. ~/.r3u-remittance is outside that sync scope.
const configDir = path.join(os.homedir(), ".r3u-remittance");
const configPath = path.join(configDir, "smtp-config.json");

export function getSmtpConfigPath(): string {
  return configPath;
}

function readFileConfig(): SmtpConfig | null {
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (raw.host && raw.user && raw.pass) {
      return {
        host: String(raw.host),
        port: Number(raw.port) || 587,
        user: String(raw.user),
        pass: String(raw.pass),
        from: String(raw.from || raw.user),
      };
    }
  } catch {
    // fall through to env fallback
  }
  return null;
}

function readEnvConfig(): SmtpConfig | null {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
    };
  }
  return null;
}

/** The saved-settings file takes precedence over `.env.local`. */
export function readSmtpConfig(): SmtpConfig | null {
  return readFileConfig() ?? readEnvConfig();
}

export function writeSmtpConfig(config: SmtpConfig): void {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export type SmtpConfigSource = "settings" | "env" | "none";

export function smtpConfigSource(): SmtpConfigSource {
  if (readFileConfig()) return "settings";
  if (readEnvConfig()) return "env";
  return "none";
}

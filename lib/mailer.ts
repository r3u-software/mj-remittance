import nodemailer from "nodemailer";
import type { SendRequestItem, SendResultItem } from "./types";
import { recordSend } from "./db";
import { readSmtpConfig, type SmtpConfig } from "./smtpConfig";
import { buildEmailBody, buildEmailSubject } from "./emailTemplate";

function buildTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
}

/**
 * Sends (or dry-runs, if no SMTP settings are saved yet — see
 * app/settings) a remittance advice email per supplier and records
 * every attempt in the local audit log.
 */
export async function sendRemittanceEmails(
  runId: string,
  items: SendRequestItem[]
): Promise<SendResultItem[]> {
  const config = readSmtpConfig();
  const dryRun = !config;
  const transporter = config ? buildTransport(config) : null;

  const results: SendResultItem[] = [];

  for (const item of items) {
    let result: SendResultItem;
    if (dryRun) {
      result = { supplierNo: item.supplierNo, email: item.email, status: "dry-run" };
    } else {
      try {
        await transporter!.sendMail({
          from: config!.from,
          to: item.email,
          subject: buildEmailSubject(item),
          text: buildEmailBody(item),
          attachments: [
            {
              filename: `${item.supplierNo}.pdf`,
              content: Buffer.from(item.pdfBase64, "base64"),
              contentType: "application/pdf",
            },
          ],
        });
        result = { supplierNo: item.supplierNo, email: item.email, status: "sent" };
      } catch (error) {
        result = {
          supplierNo: item.supplierNo,
          email: item.email,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    results.push(result);
    recordSend({
      runId,
      supplierNo: item.supplierNo,
      email: item.email,
      amount: item.computedTotal,
      status: result.status,
      error: result.error ?? null,
    });
  }

  return results;
}

/** Verifies a set of SMTP settings actually connect/authenticate, without sending anything. */
export async function testSmtpConnection(
  config: SmtpConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await buildTransport(config).verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

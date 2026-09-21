"use client";

import { Shell } from "@/components/Shell";
import { Appearance } from "@/components/Appearance";
import { SmtpSettings } from "@/components/SmtpSettings";

export default function SettingsPage() {
  return (
    <Shell title="Settings" subtitle="Appearance and SMTP credentials">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Appearance />
        <SmtpSettings />
      </div>
    </Shell>
  );
}

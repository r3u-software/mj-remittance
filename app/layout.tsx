import type { Metadata } from "next";
import "./globals.css";
import { RunProvider } from "@/components/RunProvider";
import { DevToolsDeterrent } from "@/components/DevToolsDeterrent";

export const metadata: Metadata = {
  title: "MJ Remittance — Cummins AP",
  description: "Local supplier remittance advice tool",
};

// Applies the saved theme/mode (see components/Appearance.tsx) before
// first paint, so switching them on Settings doesn't flash back to the
// default on the next page load.
const themeBootScript = `
(function () {
  try {
    var theme = localStorage.getItem("remittance-theme");
    var mode = localStorage.getItem("remittance-mode");
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    if (mode) document.documentElement.setAttribute("data-mode", mode);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="crimson" data-mode="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <DevToolsDeterrent />
        <RunProvider>{children}</RunProvider>
      </body>
    </html>
  );
}

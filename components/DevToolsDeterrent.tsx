"use client";

import { useEffect } from "react";

/**
 * Disables the right-click menu and common "poke around" shortcuts
 * (F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U, Ctrl/Cmd+S).
 *
 * This is a UX deterrent for non-technical staff who might idly
 * right-click / hit F12 out of curiosity — NOT a security control.
 * The source is already public on GitHub, and any of this is
 * trivially bypassed (browser menu, a different shortcut, viewing the
 * repo directly). Don't extend this file expecting it to protect
 * anything real — see CLAUDE.md.
 */
export function DevToolsDeterrent() {
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    const blockShortcuts = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      const isDevToolsKey =
        e.key === "F12" ||
        (mod && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (mod && key === "u") || // view-source
        (mod && key === "s"); // save page

      if (isDevToolsKey) e.preventDefault();
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockShortcuts);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockShortcuts);
    };
  }, []);

  return null;
}

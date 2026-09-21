"use client";

import { useEffect, useState } from "react";

// Same 20-theme palette as tk-dashboard (Projects/tk-dashboard), so
// the picker is identical across R3U modules — see globals.css for
// the matching [data-theme] variable blocks.
const THEMES = [
  { name: "Ocean", key: "ocean", c1: "#2f8fff", c2: "#00d4ff" },
  { name: "Royal", key: "royal", c1: "#3a56ff", c2: "#6b8cff" },
  { name: "Emerald", key: "emerald", c1: "#10b981", c2: "#34e0a1" },
  { name: "Forest", key: "forest", c1: "#2f9e44", c2: "#94d82d" },
  { name: "Purple", key: "purple", c1: "#8b5cf6", c2: "#c084fc" },
  { name: "Crimson", key: "crimson", c1: "#ef4444", c2: "#ff7a7a" },
  { name: "Amber", key: "amber", c1: "#f59e0b", c2: "#fcd34d" },
  { name: "Rose", key: "rose", c1: "#f43f8e", c2: "#fda4d0" },
  { name: "Teal", key: "teal", c1: "#14b8a6", c2: "#5eead4" },
  { name: "Sunset", key: "sunset", c1: "#ff6b6b", c2: "#ffd166" },
  { name: "Midnight", key: "midnight", c1: "#1e3a5f", c2: "#4a90d9" },
  { name: "Violet", key: "violet", c1: "#7c3aed", c2: "#a855f7" },
  { name: "Coral", key: "coral", c1: "#f97316", c2: "#fb923c" },
  { name: "Mint", key: "mint", c1: "#059669", c2: "#6ee7b7" },
  { name: "Sky", key: "sky", c1: "#0ea5e9", c2: "#67e8f9" },
  { name: "Gold", key: "gold", c1: "#ca8a04", c2: "#fde047" },
  { name: "Indigo", key: "indigo", c1: "#4338ca", c2: "#818cf8" },
  { name: "Cherry", key: "cherry", c1: "#be123c", c2: "#fb7185" },
  { name: "Sage", key: "sage", c1: "#4d7c5f", c2: "#86efac" },
  { name: "Dusk", key: "dusk", c1: "#7e22ce", c2: "#f472b6" },
] as const;

const MODES = [
  { key: "light", icon: "☀️", title: "Light" },
  { key: "dark", icon: "🌙", title: "Dark" },
  { key: "oled", icon: "⬛", title: "OLED Black" },
] as const;

export function Appearance() {
  const [theme, setThemeState] = useState("crimson");
  const [mode, setModeState] = useState("light");

  useEffect(() => {
    setThemeState(document.documentElement.getAttribute("data-theme") || "crimson");
    setModeState(document.documentElement.getAttribute("data-mode") || "light");
  }, []);

  function setTheme(key: string) {
    document.documentElement.setAttribute("data-theme", key);
    try {
      localStorage.setItem("remittance-theme", key);
    } catch {
      // per-viewer convenience only
    }
    setThemeState(key);
  }

  function setMode(key: string) {
    document.documentElement.setAttribute("data-mode", key);
    try {
      localStorage.setItem("remittance-mode", key);
    } catch {
      // per-viewer convenience only
    }
    setModeState(key);
  }

  return (
    <div className="panel">
      <h3>🎨 Appearance</h3>
      <p className="hint">Theme and display mode — saved automatically, on this device only.</p>
      <div className="row" style={{ margin: "8px 0 4px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Mode:</span>
        <div className="toggle">
          {MODES.map((m) => (
            <button key={m.key} className={mode === m.key ? "on" : ""} title={m.title} onClick={() => setMode(m.key)}>
              {m.icon}
            </button>
          ))}
        </div>
        <div className="swatches" style={{ marginLeft: "auto" }}>
          {THEMES.map((t) => (
            <button
              key={t.key}
              className={`sw ${theme === t.key ? "active" : ""}`}
              title={t.name}
              onClick={() => setTheme(t.key)}
              style={{ background: `linear-gradient(135deg, ${t.c1}, ${t.c2})` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

// Neutral cathedral blue, distinct from every operation tone.
const DEFAULT_LIGHT = "#6f93c4";

/** Tints the vitral light with an operation's color while this page is open. */
export function SetLight({ color }: { color?: string | null }) {
  useEffect(() => {
    const root = document.body;
    root.style.setProperty("--op", color || DEFAULT_LIGHT);
    return () => {
      root.style.setProperty("--op", DEFAULT_LIGHT);
    };
  }, [color]);
  return null;
}

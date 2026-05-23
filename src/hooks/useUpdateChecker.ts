import { useState, useEffect, useCallback } from "react";

/**
 * Periodically fetches /version.json and compares the server's buildId
 * with the one baked into this bundle at compile time.
 *
 * When a mismatch is detected → `updateAvailable = true`.
 * Calling `applyUpdate()` hard-reloads the page so the browser fetches the
 * new assets.
 */

declare const __BUILD_ID__: string;

export function useUpdateChecker(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const applyUpdate = useCallback(() => {
    // Force a full page reload bypassing cache
    window.location.reload();
  }, []);

  useEffect(() => {
    // In dev mode __BUILD_ID__ is "development" — skip checking
    const currentBuildId =
      typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
    if (!currentBuildId || currentBuildId === "development") return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.buildId && data.buildId !== currentBuildId && !cancelled) {
          setUpdateAvailable(true);
        }
      } catch {
        // Network errors are silently ignored — will retry on next interval
      }
    };

    // First check after 30 seconds (let the panel finish loading)
    const initialTimeout = setTimeout(check, 30_000);
    // Then check every `intervalMs` (default 5 min)
    const interval = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { updateAvailable, applyUpdate };
}

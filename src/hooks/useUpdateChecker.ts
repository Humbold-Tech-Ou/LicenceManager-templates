import { useState, useEffect, useCallback, useRef } from "react";
import { ownerSupabase } from "@/hooks/useOwnerPanel";

/**
 * Detects pending updates via two complementary channels:
 *
 * 1. **Supabase `panel_config.pending_update`** — set by the SuperAdmin when
 *    pushing a new version. Reliable, not affected by CDN caching.
 * 2. **`/version.json` polling** — fallback that compares the server's buildId
 *    with the one baked into this bundle at compile time.
 *
 * When either detects a new version → `updateAvailable = true`.
 * Calling `applyUpdate()` clears the signal and hard-reloads the page.
 */

declare const __BUILD_ID__: string;

export function useUpdateChecker(intervalMs = 60_000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const cleared = useRef(false);

  const applyUpdate = useCallback(async () => {
    try {
      await ownerSupabase.rpc("clear_pending_update");
    } catch { /* best-effort */ }
    cleared.current = true;
    window.location.reload();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkSupabase = async () => {
      if (cleared.current) return;
      try {
        const { data } = await ownerSupabase
          .from("panel_config")
          .select("value")
          .eq("key", "pending_update")
          .maybeSingle();
        if (data?.value && !cancelled) {
          setUpdateAvailable(true);
        }
      } catch { /* silent */ }
    };

    const checkVersionJson = async () => {
      if (cleared.current) return;
      const currentBuildId =
        typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
      if (!currentBuildId || currentBuildId === "development") return;
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.buildId && data.buildId !== currentBuildId && !cancelled) {
          setUpdateAvailable(true);
        }
      } catch { /* silent */ }
    };

    const check = async () => {
      await checkSupabase();
      await checkVersionJson();
    };

    check();
    const interval = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { updateAvailable, applyUpdate };
}

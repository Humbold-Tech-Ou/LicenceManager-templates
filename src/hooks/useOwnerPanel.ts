import { createClient } from "@supabase/supabase-js";
import { useState, useEffect, createContext, useContext } from "react";
import type { Reseller, PanelConfig } from "@/types/owner-panel";

// ── Separate Supabase client for the Owner's own project ─────────────────────
// In production these env vars point to the tenant's Supabase project.
// In the admin panel (master) they are empty — lazy init avoids the crash.
const OWNER_URL = import.meta.env.VITE_OWNER_SUPABASE_URL as string | undefined;
const OWNER_KEY = import.meta.env.VITE_OWNER_SUPABASE_ANON_KEY as string | undefined;

let _ownerClient: ReturnType<typeof createClient> | null = null;
// Preview injection — set by PreviewProvider before any component mounts.
let _previewClient: any = null;
export function installPreviewClient(client: any) { _previewClient = client; }

function getOwnerClient() {
  if (!OWNER_URL || !OWNER_KEY) return null;
  if (!_ownerClient) {
    _ownerClient = createClient(OWNER_URL, OWNER_KEY);
  }
  return _ownerClient;
}

// Stub returned when owner Supabase env vars are not configured (admin panel context).
// Mimics the shape of the real client so calls like `ownerSupabase.auth.getSession()`
// or `ownerSupabase.from(...).select(...)` don't throw — they resolve with empty data.
const notConfigured = { data: null, error: { message: "Owner Supabase not configured" } };
const emptyList = { data: [], error: null };

const stubQueryBuilder: any = {
  select: () => stubQueryBuilder,
  insert: () => stubQueryBuilder,
  update: () => stubQueryBuilder,
  delete: () => stubQueryBuilder,
  upsert: () => stubQueryBuilder,
  eq: () => stubQueryBuilder,
  neq: () => stubQueryBuilder,
  in: () => stubQueryBuilder,
  order: () => stubQueryBuilder,
  limit: () => stubQueryBuilder,
  single: () => Promise.resolve(notConfigured),
  maybeSingle: () => Promise.resolve(notConfigured),
  then: (resolve: (v: typeof emptyList) => unknown) => Promise.resolve(emptyList).then(resolve),
};

const stubAuth = {
  getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  onAuthStateChange: (_cb: unknown) => ({
    data: { subscription: { unsubscribe: () => {} } },
  }),
  signInWithPassword: () => Promise.resolve(notConfigured),
  signOut: () => Promise.resolve({ error: null }),
};

const stubClient = {
  auth: stubAuth,
  from: () => stubQueryBuilder,
  functions: { invoke: () => Promise.resolve(notConfigured) },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ownerSupabase: any = new Proxy({} as any, {
  get(_target, prop) {
    // Preview mock takes priority over real client and stub.
    const client = _previewClient ?? getOwnerClient() ?? (stubClient as unknown as ReturnType<typeof createClient>);
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? (val as (...a: unknown[]) => unknown).bind(client) : val;
  },
});

// ── Cascading impersonation context ──────────────────────────────────────────
// Used when SuperAdmin impersonates a specific reseller inside a tenant's panel.

export interface CascadingImpersonationCtx {
  /** true when rendered inside an impersonation wrapper */
  isImpersonationMode: boolean;
  /** The reseller being impersonated (null = viewing as owner) */
  impersonatedReseller: Reseller | null;
  /** Set a reseller to impersonate, or null to exit */
  setImpersonatedReseller: (r: Reseller | null) => void;
}

const CascadingImpersonationContext = createContext<CascadingImpersonationCtx>({
  isImpersonationMode: false,
  impersonatedReseller: null,
  setImpersonatedReseller: () => {},
});

import React from "react";

export function CascadingImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [impersonatedReseller, setImpersonatedReseller] = useState<Reseller | null>(null);
  return React.createElement(
    CascadingImpersonationContext.Provider,
    { value: { isImpersonationMode: true, impersonatedReseller, setImpersonatedReseller } },
    children
  );
}

export function useCascadingImpersonation(): CascadingImpersonationCtx {
  return useContext(CascadingImpersonationContext);
}

// ── Auth context ──────────────────────────────────────────────────────────────

export interface OwnerAuthCtx {
  reseller: Reseller | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const OwnerAuthContext = createContext<OwnerAuthCtx>({
  reseller: null,
  loading: true,
  signOut: async () => {},
});

export function OwnerAuthProvider({ children }: { children: React.ReactNode }) {
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerSupabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadReseller(session.user.email!);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = ownerSupabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadReseller(session.user.email!);
      } else {
        setReseller(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadReseller(email: string) {
    const { data } = await ownerSupabase
      .from("resellers")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    setReseller(
      data
        ? { ...data, credits_available: (data.credits_total ?? 0) - (data.credits_used ?? 0) }
        : null
    );
    setLoading(false);
  }

  async function signOut() {
    await ownerSupabase.auth.signOut();
  }

  return React.createElement(OwnerAuthContext.Provider, { value: { reseller, loading, signOut } }, children);
}

export function useOwnerAuth(): OwnerAuthCtx {
  const ctx = useContext(OwnerAuthContext);
  const { impersonatedReseller } = useContext(CascadingImpersonationContext);
  // When cascading impersonation is active, override the session reseller
  if (impersonatedReseller) {
    return { ...ctx, reseller: impersonatedReseller };
  }
  return ctx;
}

// ── Panel config helper ───────────────────────────────────────────────────────

export function useOwnerConfig() {
  const [config, setConfig] = useState<PanelConfig>({
    branding: { name: "Mi Panel IPTV", primary_color: "#7C3AED" },
    demo_policy: { global_monthly_limit: 50 },
    network_depth: { max_levels: null },
    features: { vod: true, streams: true, demos: true, resellers: true, custom_packages: true },
  });

  useEffect(() => {
    ownerSupabase
      .from("panel_config")
      .select("key, value")
      .then(({ data }) => {
        if (!data) return;
        const merged: Partial<PanelConfig> = {};
        for (const row of data) {
          (merged as Record<string, unknown>)[row.key] = row.value;
        }
        setConfig((c) => ({ ...c, ...merged }));
      });
  }, []);

  return config;
}

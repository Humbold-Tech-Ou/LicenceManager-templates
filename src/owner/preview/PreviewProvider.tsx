// Preview shell — wraps /owner-preview/* routes with mock Supabase client
import { type ReactNode, useState, useEffect } from "react";
import { installPreviewClient } from "@/hooks/useOwnerPanel";
import {
  mockReseller, mockResellers, mockPackages, mockLines,
  mockServers, mockVod, mockPanelConfig, mockActiveConnections,
} from "./mockData";

// ── Mock query builder ────────────────────────────────────────────────────────
function makeTable(initialRows: unknown[]) {
  let rows = initialRows.slice();
  const builder: any = new Proxy({}, {
    get(_: any, method: string) {
      if (method === "single")
        return () => Promise.resolve({ data: rows[0] ?? null, error: null });
      if (method === "maybeSingle")
        return () => Promise.resolve({ data: rows[0] ?? null, error: null });
      if (method === "then")
        return (resolve: (v: any) => unknown) =>
          Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve);
      if (method === "catch") return () => builder;
      if (method === "insert") return (data: unknown) => Promise.resolve({ data, error: null });
      if (method === "upsert") return (data: unknown) => Promise.resolve({ data, error: null });
      if (method === "update")
        return () => ({ ...builder, eq: () => Promise.resolve({ data: null, error: null }) });
      if (method === "delete")
        return () => ({ ...builder, eq: () => Promise.resolve({ data: null, error: null }) });
      if (method === "eq")
        return (col: string, val: unknown) => { rows = rows.filter((r: any) => r?.[col] === val); return builder; };
      if (method === "neq")
        return (col: string, val: unknown) => { rows = rows.filter((r: any) => r?.[col] !== val); return builder; };
      if (method === "in")
        return (col: string, vals: unknown[]) => { rows = rows.filter((r: any) => vals.includes(r?.[col])); return builder; };
      if (method === "gt")
        return (col: string, val: unknown) => { rows = rows.filter((r: any) => r?.[col] > val); return builder; };
      if (method === "gte")
        return (col: string, val: unknown) => { rows = rows.filter((r: any) => r?.[col] >= val); return builder; };
      if (method === "lt")
        return (col: string, val: unknown) => { rows = rows.filter((r: any) => r?.[col] < val); return builder; };
      if (method === "lte")
        return (col: string, val: unknown) => { rows = rows.filter((r: any) => r?.[col] <= val); return builder; };
      if (method === "limit")
        return (n: number) => { rows = rows.slice(0, n); return builder; };
      if (method === "range")
        return (from: number, to: number) => { rows = rows.slice(from, to + 1); return builder; };
      return () => builder;
    },
  });
  return builder;
}

const TABLES: Record<string, unknown[]> = {
  resellers:          mockResellers,
  packages:           mockPackages,
  lines:              mockLines,
  servers:            mockServers,
  vod_items:          mockVod,
  panel_config:       mockPanelConfig,
  active_connections: mockActiveConnections,
  streams:            [],
};

const MOCK_SESSION = {
  user: { id: mockReseller.id, email: mockReseller.email, role: "authenticated" },
  access_token: "preview-token",
  token_type: "bearer",
};

const mockClient = {
  from: (table: string) => makeTable(TABLES[table] ?? []),
  rpc: () => Promise.resolve({ data: null, error: null }),
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({ unsubscribe: () => {} }),
    unsubscribe: () => {},
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: MOCK_SESSION }, error: null }),
    onAuthStateChange: (cb: (event: string, session: any) => void) => {
      setTimeout(() => cb("SIGNED_IN", MOCK_SESSION), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getUser: () => Promise.resolve({ data: { user: MOCK_SESSION.user }, error: null }),
    signInWithPassword: () =>
      Promise.resolve({ data: { session: MOCK_SESSION, user: MOCK_SESSION.user }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
};

// ── PreviewProvider component ─────────────────────────────────────────────────
export function PreviewProvider({ children }: { children: ReactNode }) {
  // Install mock client synchronously on first render (before children run queries).
  // useState initializer runs once and before any child effect — safe for this pattern.
  useState(() => {
    installPreviewClient(mockClient);
    return null;
  });

  // IMPORTANT: reset the mock client when the preview unmounts so it doesn't leak
  // into the real /owner/* routes if the user navigates between preview and live panel.
  useEffect(() => {
    installPreviewClient(mockClient); // ensure it's set after hydration too
    return () => {
      installPreviewClient(null);     // cleanup on unmount → real client takes over
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 py-1.5 text-center font-medium">
        🧪 Modo vista previa — datos ficticios, sin conexión a base de datos real
      </div>
      {children}
    </div>
  );
}

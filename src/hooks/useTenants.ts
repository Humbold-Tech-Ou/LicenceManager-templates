import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/types/tenant";

export type SortKey = "owner_email" | "plan" | "status" | "expires_at" | "created_at";
export type SortDir = "asc" | "desc";

export const TENANTS_PER_PAGE = 20;

function readExpiry(searchParams: URLSearchParams): string {
  const f = searchParams.get("filter");
  if (f === "expiring" || f === "expiring7") return "7";
  if (f === "expiring30") return "30";
  if (f === "expired") return "expired";
  return searchParams.get("expiry") ?? "all";
}

export function useTenants() {
  const [searchParams] = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
  const [planFilter, setPlanFilter] = useState(() => searchParams.get("plan") ?? "all");
  const [onboardingFilter, setOnboardingFilter] = useState(() => searchParams.get("onboarding") ?? "all");
  const [expiryFilter, setExpiryFilter] = useState(() => readExpiry(searchParams));

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const fetchTenants = async () => {
    const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    setTenants(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filtered = useMemo(() => {
    let list = tenants;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.owner_email.toLowerCase().includes(q) || t.owner_name?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (planFilter !== "all") list = list.filter((t) => t.plan === planFilter);
    if (onboardingFilter !== "all") {
      if (onboardingFilter === "done") list = list.filter((t) => t.onboarding_done);
      else if (onboardingFilter === "in_progress") list = list.filter((t) => !t.onboarding_done && (t.onboarding_step ?? 0) > 0);
      else list = list.filter((t) => !t.onboarding_done && (t.onboarding_step ?? 0) === 0);
    }
    if (expiryFilter !== "all") {
      list = list.filter((t) => {
        const d = differenceInDays(new Date(t.expires_at), new Date());
        if (expiryFilter === "expired") return d < 0;
        if (expiryFilter === "7") return d >= 0 && d <= 7;
        if (expiryFilter === "30") return d >= 0 && d <= 30;
        if (expiryFilter === "safe") return d > 30;
        return true;
      });
    }
    const sorted = [...list].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "expires_at" || sortKey === "created_at") {
        av = new Date(a[sortKey] ?? 0).getTime();
        bv = new Date(b[sortKey] ?? 0).getTime();
      } else {
        av = (a[sortKey] ?? "").toString().toLowerCase();
        bv = (b[sortKey] ?? "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [tenants, search, statusFilter, planFilter, onboardingFilter, expiryFilter, sortKey, sortDir]);

  const paged = filtered.slice(page * TENANTS_PER_PAGE, (page + 1) * TENANTS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / TENANTS_PER_PAGE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  const hasActiveFilters = !!search || statusFilter !== "all" || planFilter !== "all" || onboardingFilter !== "all" || expiryFilter !== "all";

  const clearFilters = () => {
    setSearchInput(""); setSearch("");
    setStatusFilter("all"); setPlanFilter("all");
    setOnboardingFilter("all"); setExpiryFilter("all");
    setPage(0);
  };

  return {
    tenants, loading, fetchTenants,
    searchInput, setSearchInput,
    statusFilter, setStatusFilter: (v: string) => { setStatusFilter(v); setPage(0); },
    planFilter, setPlanFilter: (v: string) => { setPlanFilter(v); setPage(0); },
    onboardingFilter, setOnboardingFilter: (v: string) => { setOnboardingFilter(v); setPage(0); },
    expiryFilter, setExpiryFilter: (v: string) => { setExpiryFilter(v); setPage(0); },
    sortKey, sortDir, toggleSort,
    page, setPage, totalPages,
    filtered, paged,
    hasActiveFilters, clearFilters,
  };
}

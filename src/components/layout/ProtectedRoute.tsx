import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, role, tenant, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  // Tenant trying to access admin routes → send to their portal
  if (requireAdmin && role === "tenant") return <Navigate to={`/portal/${tenant?.id}`} replace />;
  // Admin trying to access tenant portal → send to dashboard
  if (!requireAdmin && role === "superadmin" && window.location.pathname.startsWith("/portal")) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

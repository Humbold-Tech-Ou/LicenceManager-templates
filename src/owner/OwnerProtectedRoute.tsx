import { Navigate, Outlet } from "react-router-dom";
import { useOwnerAuth } from "@/hooks/useOwnerPanel";

export default function OwnerProtectedRoute() {
  const { reseller, loading } = useOwnerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!reseller) {
    return <Navigate to="/owner/login" replace />;
  }

  return <Outlet />;
}

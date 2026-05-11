import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { OwnerAuthProvider } from "@/hooks/useOwnerPanel";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Tenants from "@/pages/Tenants";
import TenantDetail from "@/pages/TenantDetail";
import Settings from "@/pages/Settings";
import PanelVersions from "@/pages/PanelVersions";
import PanelVersionDetail from "@/pages/PanelVersionDetail";
import Onboarding from "@/pages/Onboarding";
import OAuthCallback from "@/pages/OAuthCallback";
import TenantPortal from "@/pages/TenantPortal";
import NotFound from "@/pages/NotFound";
// Owner panel
import OwnerLogin from "@/owner/OwnerLogin";
import OwnerLayout from "@/owner/OwnerLayout";
import OwnerProtectedRoute from "@/owner/OwnerProtectedRoute";
import OwnerDashboard from "@/owner/Dashboard";
import OwnerResellers from "@/owner/Resellers";
import OwnerLines from "@/owner/Lines";
import OwnerPackages from "@/owner/Packages";
import OwnerServers from "@/owner/Servers";
import OwnerVOD from "@/owner/VOD";
import OwnerSettings from "@/owner/Settings";
// Owner preview (public, mock data)
import { PreviewProvider } from "@/owner/preview/PreviewProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OwnerAuthProvider>
            <Routes>
              <Route path="/login" element={<Navigate to="/owner/login" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/owner/login" replace />} />
              {/* Super admin routes */}
              <Route element={<ProtectedRoute requireAdmin><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tenants" element={<Tenants />} />
                <Route path="/tenants/:id" element={<TenantDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/versions" element={<PanelVersions />} />
                <Route path="/versions/:id" element={<PanelVersionDetail />} />
              </Route>
              {/* Tenant routes */}
              <Route path="/portal/:tenantId" element={<ProtectedRoute><TenantPortal /></ProtectedRoute>} />
              {/* Public onboarding routes — no auth required */}
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/onboarding/:tenantId" element={<Onboarding />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              {/* Owner panel routes — separate Supabase auth */}
              <Route path="/owner/login" element={<OwnerLogin />} />
              <Route path="/owner" element={<OwnerProtectedRoute />}>
                <Route element={<OwnerLayout />}>
                  <Route index element={<Navigate to="/owner/dashboard" replace />} />
                  <Route path="dashboard" element={<OwnerDashboard />} />
                  <Route path="resellers" element={<OwnerResellers />} />
                  <Route path="lines" element={<OwnerLines />} />
                  <Route path="packages" element={<OwnerPackages />} />
                  <Route path="servers" element={<OwnerServers />} />
                  <Route path="vod" element={<OwnerVOD />} />
                  <Route path="settings" element={<OwnerSettings />} />
                </Route>
              </Route>
              {/* Public preview routes — no auth, mock data */}
              <Route path="/owner-preview/login" element={<PreviewProvider><OwnerLogin /></PreviewProvider>} />
              <Route path="/owner-preview" element={<PreviewProvider><OwnerLayout /></PreviewProvider>}>
                <Route index element={<Navigate to="/owner-preview/dashboard" replace />} />
                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="lines"     element={<OwnerLines />} />
                <Route path="resellers" element={<OwnerResellers />} />
                <Route path="packages"  element={<OwnerPackages />} />
                <Route path="servers"   element={<OwnerServers />} />
                <Route path="vod"       element={<OwnerVOD />} />
                <Route path="settings"  element={<OwnerSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OwnerAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

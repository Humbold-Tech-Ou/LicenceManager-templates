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
import Audit from "@/pages/Audit";
import TenantImpersonate from "@/pages/TenantImpersonate";
import Onboarding from "@/pages/Onboarding";
import OAuthCallback from "@/pages/OAuthCallback";
import TenantPortal from "@/pages/TenantPortal";
import NotFound from "@/pages/NotFound";
// Owner panel
import { PreviewProvider } from "@/owner/preview/PreviewProvider";
import OwnerLogin from "@/owner/OwnerLogin";
import OwnerLayout from "@/owner/OwnerLayout";
import OwnerProtectedRoute from "@/owner/OwnerProtectedRoute";
import { CascadingImpersonationProvider } from "@/hooks/useOwnerPanel";
import OwnerDashboard from "@/owner/Dashboard";
import OwnerResellers from "@/owner/Resellers";
import OwnerLines from "@/owner/Lines";
import OwnerPackages from "@/owner/Packages";
import OwnerServers from "@/owner/Servers";
import OwnerStreams from "@/owner/Streams";
import OwnerBouquets from "@/owner/Bouquets";
import OwnerEPG from "@/owner/EPGSources";
import OwnerVOD from "@/owner/VOD";
import OwnerVODDetail from "@/owner/VODDetail";
import OwnerTickets from "@/owner/Tickets";
import OwnerSettings from "@/owner/Settings";
import OwnerLibrary from "@/owner/Library";
import OwnerServerStats from "@/owner/ServerStats";

const queryClient = new QueryClient();

// When VITE_OWNER_SUPABASE_URL is set the app is running as a tenant panel deployment.
// In that context: redirect root to /owner/login and exclude /owner-preview/* routes
// so tenants never see mock data.
const IS_TENANT_PANEL = !!import.meta.env.VITE_OWNER_SUPABASE_URL;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OwnerAuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Tenant panels land on /owner/login; super admin panel lands on /dashboard */}
              <Route path="/" element={<Navigate to={IS_TENANT_PANEL ? "/owner/login" : "/dashboard"} replace />} />
              {/* Super admin routes */}
              <Route element={<ProtectedRoute requireAdmin><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tenants" element={<Tenants />} />
                <Route path="/tenants/:id" element={<TenantDetail />} />
                <Route path="/tenants/:id/impersonate/*" element={<TenantImpersonate />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/versions" element={<PanelVersions />} />
                <Route path="/versions/:id" element={<PanelVersionDetail />} />
                <Route path="/audit" element={<Audit />} />
              </Route>
              {/* Tenant routes */}
              <Route path="/portal/:tenantId" element={<ProtectedRoute><TenantPortal /></ProtectedRoute>} />
              {/* Public onboarding routes — no auth required */}
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/onboarding/:tenantId" element={<Onboarding />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/oauth/vercel/callback" element={<OAuthCallback />} />
              {/* Owner panel routes — separate Supabase auth */}
              <Route path="/owner/login" element={<OwnerLogin />} />
              <Route path="/owner" element={<OwnerProtectedRoute />}>
                <Route element={<CascadingImpersonationProvider><OwnerLayout /></CascadingImpersonationProvider>}>
                  <Route index element={<Navigate to="/owner/dashboard" replace />} />
                  <Route path="dashboard" element={<OwnerDashboard />} />
                  <Route path="resellers" element={<OwnerResellers />} />
                  <Route path="lines" element={<OwnerLines />} />
                  <Route path="packages" element={<OwnerPackages />} />
                  <Route path="servers" element={<OwnerServers />} />
                  <Route path="server-stats" element={<OwnerServerStats />} />
                  <Route path="streams" element={<OwnerStreams />} />
                  <Route path="bouquets" element={<OwnerBouquets />} />
                  <Route path="epg" element={<OwnerEPG />} />
                  <Route path="library" element={<OwnerLibrary />} />
                  <Route path="vod">
                    <Route index element={<OwnerVOD />} />
                    <Route path=":id" element={<OwnerVODDetail />} />
                  </Route>
                  <Route path="tickets" element={<OwnerTickets />} />
                  <Route path="settings" element={<OwnerSettings />} />
                </Route>
              </Route>
              {/* Public preview routes — only in super admin context, excluded from tenant deploys */}
              {!IS_TENANT_PANEL && (
                <>
                  <Route path="/owner-preview/login" element={<PreviewProvider><OwnerLogin /></PreviewProvider>} />
                  <Route path="/owner-preview" element={<PreviewProvider><OwnerLayout /></PreviewProvider>}>
                    <Route index element={<Navigate to="/owner-preview/dashboard" replace />} />
                    <Route path="dashboard" element={<OwnerDashboard />} />
                    <Route path="lines"     element={<OwnerLines />} />
                    <Route path="resellers" element={<OwnerResellers />} />
                    <Route path="packages"  element={<OwnerPackages />} />
                    <Route path="servers"   element={<OwnerServers />} />
                    <Route path="server-stats" element={<OwnerServerStats />} />
                    <Route path="streams"  element={<OwnerStreams />} />
                    <Route path="bouquets" element={<OwnerBouquets />} />
                    <Route path="epg"      element={<OwnerEPG />} />
                    <Route path="library"  element={<OwnerLibrary />} />
                    <Route path="vod">
                      <Route index element={<OwnerVOD />} />
                      <Route path=":id" element={<OwnerVODDetail />} />
                    </Route>
                    <Route path="tickets"  element={<OwnerTickets />} />
                    <Route path="settings"  element={<OwnerSettings />} />
                  </Route>
                </>
              )}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OwnerAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

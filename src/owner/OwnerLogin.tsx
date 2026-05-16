import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ownerSupabase, useOwnerConfig } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function OwnerLogin() {
  const navigate = useNavigate();
  const config = useOwnerConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError } = await ownerSupabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      setLoading(false);
      return;
    }
    navigate("/owner/dashboard", { replace: true });
  }

  const primaryColor = config.branding?.primary_color || "#7C3AED";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div
            className="flex size-12 items-center justify-center rounded-full mx-auto"
            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
          >
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {config.branding.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Accede a tu panel de gestión
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="tu@email.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full gap-2 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Panel IPTV · Powered by Vivacore
        </p>
      </div>
    </div>
  );
}

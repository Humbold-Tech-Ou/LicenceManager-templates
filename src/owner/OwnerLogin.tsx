import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ownerSupabase, useOwnerConfig } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export default function OwnerLogin() {
  const navigate = useNavigate();
  const config = useOwnerConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 mx-auto">
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
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

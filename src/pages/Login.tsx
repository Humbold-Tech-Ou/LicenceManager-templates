import { useState, useEffect, useId } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { user, role, tenant } = useAuth();
  const navigate = useNavigate();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !role) return;
    if (role === "tenant" && tenant) navigate(`/portal/${tenant.id}`, { replace: true });
    else if (role === "superadmin") navigate("/dashboard", { replace: true });
  }, [user, role, tenant, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError("Credenciales incorrectas.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Icon + header */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
            <svg
              className="stroke-zinc-800"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 32 32"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M16 3 L16 3 L28 8 L28 16 C28 22 22 27 16 29 C10 27 4 22 4 16 L4 8 Z"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              License Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${id}-email`}>Email</Label>
              <Input
                id={`${id}-email`}
                type="email"
                placeholder="admin@tupanel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`${id}-password`}>Contraseña</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id={`${id}-password`}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Entrando...
              </span>
            ) : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Tu puerta de entrada al ecosistema IPTV.
        </p>
      </div>
    </div>
  );
}

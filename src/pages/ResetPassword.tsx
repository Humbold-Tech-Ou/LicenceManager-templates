import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When user clicks the recovery link, Supabase parses the URL fragment and
  // emits PASSWORD_RECOVERY. In v2 this can fire before useEffect runs,
  // so we use three layers to avoid the race condition:
  //   1. onAuthStateChange for PASSWORD_RECOVERY or SIGNED_IN
  //   2. getSession() fallback (in case event already fired)
  //   3. URL hash check (instant, no async needed)
  useEffect(() => {
    // Layer 3: check URL hash directly — no async delay
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
      return;
    }

    // Layer 1: listen for the auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      } else if (event === "SIGNED_IN" && session) {
        // Supabase v2 sometimes emits SIGNED_IN instead of PASSWORD_RECOVERY
        setReady(true);
      }
    });

    // Layer 2: poll getSession briefly in case the event already fired
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
    };
    check();
    const interval = setInterval(check, 500);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Mínimo 6 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) return setError(err.message);

    toast.success("Contraseña actualizada");
    // Redirect based on role — useAuth will pick up the session.
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
            <KeyRound className="size-5 text-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Nueva contraseña
            </h1>
            <p className="text-sm text-muted-foreground">
              Define una contraseña nueva para tu cuenta.
            </p>
          </div>
        </div>

        {!ready ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
            Validando enlace de recuperación…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-pass">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="new-pass"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Confirmar contraseña</Label>
              <Input
                id="confirm-pass"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Actualizar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

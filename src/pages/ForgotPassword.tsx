import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const RESEND_SECONDS = 120; // 2 minutes
const RATE_LIMIT_SECONDS = 300; // 5 minutes — Supabase default for /recover

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown when email is sent
  useEffect(() => {
    if (!sent) return;
    startCountdown(rateLimited ? RATE_LIMIT_SECONDS : RESEND_SECONDS);
    return () => clearInterval(intervalRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent]);

  function startCountdown(seconds: number) {
    clearInterval(intervalRef.current!);
    setCountdown(seconds);
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function sendRecoveryEmail(isResend = false) {
    if (isResend) setResending(true);
    else setLoading(true);

    try {
      // Native Supabase flow — the Auth Hook (send-auth-email) intercepts
      // and sends the email via SMTP using the custom template from /settings.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      if (isResend) {
        toast.success("Correo reenviado correctamente");
        setRateLimited(false);
        startCountdown(RESEND_SECONDS);
      } else {
        setRateLimited(false);
        setSent(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar el correo";
      // On rate limit, switch to "sent" view with a longer countdown so the
      // user knows exactly when they can retry.
      if (msg.toLowerCase().includes("rate limit")) {
        setRateLimited(true);
        if (sent) {
          startCountdown(RATE_LIMIT_SECONDS);
          toast.error("Demasiados intentos. Espera el tiempo indicado.");
        } else {
          setSent(true); // useEffect will start countdown using RATE_LIMIT_SECONDS
        }
      } else {
        toast.error(msg);
      }
    } finally {
      if (isResend) setResending(false);
      else setLoading(false);
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // Progress: goes from 100% → 0% as countdown runs
  const totalSeconds = rateLimited ? RATE_LIMIT_SECONDS : RESEND_SECONDS;
  const progress = (countdown / totalSeconds) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border">
            <MailCheck className="size-5 text-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Recuperar contraseña
            </h1>
            <p className="text-sm text-muted-foreground">
              Te enviaremos un enlace para restablecerla.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 text-center">
            {rateLimited ? (
              <>
                <p className="text-sm text-foreground">
                  Has solicitado demasiados correos seguidos para <strong>{email}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Por seguridad, debes esperar antes de poder reintentar.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  Si <strong>{email}</strong> está registrado, recibirás un email con instrucciones en unos minutos.
                </p>
                <p className="text-xs text-muted-foreground">
                  Revisa también tu carpeta de spam.
                </p>
              </>
            )}

            {/* Countdown ring + resend */}
            <div className="flex flex-col items-center gap-3 pt-1">
              {countdown > 0 ? (
                <>
                  {/* Thin progress bar */}
                  <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rateLimited ? "Podrás reintentar en " : "Podrás reenviar en "}
                    <span className="font-mono font-semibold text-violet-600 tabular-nums">
                      {formatTime(countdown)}
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="gap-1.5 text-muted-foreground/50 cursor-not-allowed"
                  >
                    <RefreshCw className="size-3.5" />
                    Reenviar correo
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    ¿No llegó el correo?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendRecoveryEmail(true)}
                    disabled={resending}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`size-3.5 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Reenviando..." : "Reenviar correo"}
                  </Button>
                </>
              )}
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-1"
            >
              <ArrowLeft className="size-3.5" /> Volver al login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); sendRecoveryEmail(false); }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Volver al login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

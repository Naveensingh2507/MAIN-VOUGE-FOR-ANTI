import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Mail, Lock, UserRoundPlus } from "lucide-react";
import { loginWithEmail, loginWithGoogle, signUp } from "@/utils/authClient";
import { useAppState } from "@/state/AppState";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { setCurrentUser, setUserProfile } = useAppState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "signup";

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (isSignUp && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const result = isSignUp
        ? await signUp({ email, password })
        : await loginWithEmail({ email, password });

      if (result.success) {
        setCurrentUser(result.user);
        if (result.user?.email) {
          setUserProfile({ email: result.user.email });
        }
        navigate(redirectTo, { replace: true });
      } else {
        setError(result.error ?? (isSignUp ? "Sign up failed. Try again." : "Login failed. Try again."));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        setCurrentUser(result.user);
        if (result.user?.email) {
          setUserProfile({ email: result.user.email });
        }
        navigate(redirectTo, { replace: true });
      } else {
        setError(result.error ?? "Google sign-in failed. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isSignUp ? "signin" : "signup");
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.6} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">AI Vogue</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {isSignUp ? "Create your wardrobe account" : "Sign in to your wardrobe"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* Mode toggle */}
          <div className="mb-6 flex rounded-xl bg-surface-container-low p-1">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${!isSignUp
                  ? "bg-card text-foreground shadow-sm"
                  : "text-on-surface-variant hover:text-foreground"
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${isSignUp
                  ? "bg-card text-foreground shadow-sm"
                  : "text-on-surface-variant hover:text-foreground"
                }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label-caps mb-1.5 block text-on-surface-variant" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-full border border-outline-variant bg-background py-3 pl-11 pr-5 text-sm outline-none transition-colors focus:border-foreground"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-caps mb-1.5 block text-on-surface-variant" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-full border border-outline-variant bg-background py-3 pl-11 pr-5 text-sm outline-none transition-colors focus:border-foreground"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </div>
            </div>

            {/* Confirm Password (sign-up only) */}
            {isSignUp && (
              <div className="animate-fade-up">
                <label className="label-caps mb-1.5 block text-on-surface-variant" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-full border border-outline-variant bg-background py-3 pl-11 pr-5 text-sm outline-none transition-colors focus:border-foreground"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="label-caps flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {isSignUp ? (
                <>
                  <UserRoundPlus className="h-4 w-4" strokeWidth={1.8} />
                  {busy ? "Creating account…" : "Create Account"}
                </>
              ) : (
                busy ? "Signing in…" : "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-on-surface-variant">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleAuth}
            disabled={busy}
            className="label-caps flex w-full items-center justify-center gap-2.5 rounded-full border border-outline-variant bg-background py-3.5 text-foreground transition-colors hover:bg-surface-container-low disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Toggle mode link */}
          <p className="mt-5 text-center text-xs text-on-surface-variant">
            {isSignUp ? (
              <>Already have an account?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>Don't have an account?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-on-surface-variant">
          By continuing, you agree to our{" "}
          <span className="cursor-pointer underline hover:text-foreground">Terms</span>{" "}
          and{" "}
          <span className="cursor-pointer underline hover:text-foreground">Privacy Policy</span>.
        </p>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-xs text-on-surface-variant underline underline-offset-2 hover:text-foreground"
          >
            Back to closet
          </Link>
        </div>
      </div>
    </div>
  );
}

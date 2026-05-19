import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

function LoginPage() {
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthError("");
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/predict`,
          skipBrowserRedirect: true
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error("Supabase did not return an OAuth URL.");
      }

      window.location.assign(data.url);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to start Google login.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/3 top-10 h-40 w-40 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          <div className="absolute right-1/4 bottom-16 h-56 w-56 rounded-full bg-[var(--glow)] blur-3xl" />
        </div>

        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr,1fr]">
          <div className="flex flex-col justify-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-glow">
                <span className="text-lg font-semibold">FG</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-strong)]">Fresh Guard</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Real-time food safety</p>
              </div>
            </div>
            <h1 className="text-4xl font-semibold text-[var(--text-strong)] sm:text-5xl">
              Welcome back.
            </h1>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Masuk dengan Google untuk mengakses halaman Predict, melihat hasil di
              Dashboard, dan membuka History milik akunmu.
            </p>
          </div>

          <div className="rounded-[32px] bg-white/90 p-8 shadow-soft">
            <div className="mb-6">
              <p className="text-sm font-semibold text-[var(--text-strong)]">Sign in</p>
              <p className="text-xs text-[var(--muted)]">Use your Google account.</p>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px]"
            >
              {isLoggingIn ? "Opening Google..." : "Continue with Google"}
            </button>
            {authError ? (
              <p className="mt-4 text-xs text-rose-600">{authError}</p>
            ) : null}
            <p className="mt-5 text-xs text-[var(--muted)]">
              By signing in, you agree to the monitoring terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

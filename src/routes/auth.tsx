import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark } from "@/components/brand";
import { PrivacyNotice } from "@/components/notice";
import { safeRedirectPath } from "@/lib/consents";

const REDIRECT_KEY = "miles.redirect";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirectPath(search["redirect"]);
    return r ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Parent sign in — Miles OS" },
      { name: "description", content: "Sign in or create a parent account for Miles OS. Children never need accounts." },
      { property: "og:title", content: "Parent sign in — Miles OS" },
      { property: "og:description", content: "Parent accounts only. Children never sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isGuardian, setIsGuardian] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function destination(): string {
    const stored = typeof window !== "undefined" ? safeRedirectPath(sessionStorage.getItem(REDIRECT_KEY)) : null;
    return search.redirect ?? stored ?? "/dashboard";
  }

  function goOn() {
    const to = destination();
    sessionStorage.removeItem(REDIRECT_KEY);
    router.history.replace(to);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goOn();
    });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") goOn();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        if (!isGuardian || !agreed) {
          toast.error("Please confirm you're a parent or guardian and agree to the privacy promise.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${search.redirect ?? "/dashboard"}`,
            data: { display_name: displayName.trim(), guardian_attested: true, privacy_version: "2026-11-mvp" },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Check your email to confirm your account, then come back and sign in.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("If an account exists for that email, a reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    if (search.redirect) sessionStorage.setItem(REDIRECT_KEY, search.redirect);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) {
      toast.error("Sign-in didn't complete. Please try again.");
      return;
    }
    if (result.redirected) return;
    goOn();
  }

  return (
    <div className="min-h-screen paper-grain">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <BrandMark />
        <div className="sketch-card p-6">
          <h1 className="text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create a parent account" : "Reset your password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Accounts are for parents and guardians only. Children never sign in.</p>

          {mode !== "forgot" && (
            <div className="mt-6 grid gap-2">
              <Button type="button" variant="outline" className="google-button" onClick={() => social("google")}>
                <GoogleLogo /> Continue with Google
              </Button>
              <Button type="button" variant="outline" onClick={() => social("lovable")}>
                <LovableMark /> Continue with Lovable
              </Button>
              <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="name">Your name (shown to your family circle)</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={60} autoComplete="name" />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            {mode !== "forgot" && (
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}
            {mode === "signup" && (
              <div className="grid gap-3 text-sm">
                <label className="flex items-start gap-3">
                  <Checkbox checked={isGuardian} onCheckedChange={(v) => setIsGuardian(v === true)} aria-label="I am a parent or legal guardian aged 18 or over" />
                  <span>I'm a parent or legal guardian aged 18 or over.</span>
                </label>
                <label className="flex items-start gap-3">
                  <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} aria-label="I agree to the privacy promise" />
                  <span>
                    I've read the <Link to="/privacy" className="underline">privacy promise</Link>.
                  </span>
                </label>
              </div>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          {message && (
            <p role="status" className="mt-4 rounded-lg bg-explore-soft p-3 text-sm text-explore">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
            {mode !== "signin" && (
              <button type="button" className="underline" onClick={() => setMode("signin")}>Have an account? Sign in</button>
            )}
            {mode !== "signup" && (
              <button type="button" className="underline" onClick={() => setMode("signup")}>New here? Create an account</button>
            )}
            {mode === "signin" && (
              <button type="button" className="underline" onClick={() => setMode("forgot")}>Forgot password?</button>
            )}
          </div>
        </div>
        <PrivacyNotice title="Parent-only accounts">
          We never create accounts or public profiles for children. You decide every consent inside the app.
        </PrivacyNotice>
      </div>
    </div>
  );
}
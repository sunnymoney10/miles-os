import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { PrivacyNotice } from "@/components/notice";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Family circle invitation — Miles OS" },
      { name: "description", content: "Accept a private invitation to a family's Miles OS circle." },
      { property: "og:title", content: "Family circle invitation — Miles OS" },
      { property: "og:description", content: "A private invitation to see journal entries a parent chooses to share." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function accept() {
    setBusy(true);
    const { error } = await supabase.rpc("accept_circle_invite", { _token: token });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You've joined the family circle");
    navigate({ to: "/shared" });
  }

  return (
    <div className="min-h-screen paper-grain">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-4 pb-16">
        <div className="sketch-card p-6">
          <h1 className="text-3xl font-semibold">You've been invited to a family circle</h1>
          <p className="mt-3 text-muted-foreground">
            A parent invited you to see the creative moments they choose to share. You'll only see entries they approve — never child profiles.
          </p>
          {email === undefined ? (
            <p className="mt-6 text-sm text-muted-foreground">Checking your sign-in…</p>
          ) : email === null ? (
            <div className="mt-6 grid gap-3">
              <p className="text-sm">Sign in or create an account with the email address the invitation was made for.</p>
              <Button asChild>
                <Link to="/auth" search={{ redirect: `/invite/${token}` }}>Sign in to accept</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              <p className="text-sm">Signed in as <strong>{email}</strong>. The invitation must match this email.</p>
              <Button onClick={accept} disabled={busy}>{busy ? "Accepting…" : "Accept invitation"}</Button>
            </div>
          )}
        </div>
        <PrivacyNotice title="Please keep it private" className="mt-6">
          Shared moments are for you only. Please don't screenshot or repost them elsewhere.
        </PrivacyNotice>
      </main>
    </div>
  );
}
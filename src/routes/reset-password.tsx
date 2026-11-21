import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Miles OS" },
      { name: "description", content: "Choose a new password for your Miles OS parent account." },
      { property: "og:title", content: "Set a new password — Miles OS" },
      { property: "og:description", content: "Choose a new password for your parent account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen paper-grain">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <BrandMark />
        <form onSubmit={onSubmit} className="sketch-card grid gap-4 p-6">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          {!isRecovery && (
            <p className="text-sm text-muted-foreground">Open this page from the reset link in your email.</p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
        </form>
      </div>
    </div>
  );
}
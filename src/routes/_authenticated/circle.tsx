import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PrivacyNotice, EmptyState } from "@/components/notice";
import { circleQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/circle")({
  head: () => ({
    meta: [
      { title: "Family circle — Miles OS" },
      { name: "description", content: "Invite close family to see journal entries you choose to share." },
      { property: "og:title", content: "Family circle — Miles OS" },
      { property: "og:description", content: "A private, invite-only family circle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(circleQuery),
  component: CirclePage,
});

function CirclePage() {
  const { data } = useSuspenseQuery(circleQuery);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("grandparent");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["circle"] });
  const link = (token: string) => `${window.location.origin}/invite/${token}`;

  async function invite(e: FormEvent) {
    e.preventDefault();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("circle_members").insert({ parent_id: auth.user?.id ?? "", display_name: name.trim(), email: email.trim(), relationship: relationship.trim() || "family" });
    if (error) { toast.error(error.message); return; }
    toast.success("Invitation recorded. It was not emailed — copy the private link and send it yourself.");
    setName(""); setEmail("");
    await refresh();
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("circle_members").update({ status: "revoked" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Access revoked");
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Private sharing" title="Family circle" />
      <PrivacyNotice title="Invitations are not emailed">Miles OS doesn't send email yet. After adding someone, copy their private link and send it yourself. They must sign in with the same email to accept.</PrivacyNotice>
      <form onSubmit={invite} className="sketch-card grid gap-4 p-6 sm:grid-cols-3">
        <div className="grid gap-1.5"><Label htmlFor="c-name">Name</Label><Input id="c-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="c-email">Email</Label><Input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="c-rel">Relationship</Label><Input id="c-rel" maxLength={40} value={relationship} onChange={(e) => setRelationship(e.target.value)} /></div>
        <Button type="submit" className="sm:col-span-3 justify-self-start">Record invitation</Button>
      </form>
      <section aria-labelledby="inv-h" className="space-y-3">
        <h2 id="inv-h" className="text-xl font-semibold">People you invited</h2>
        {data.invited.length === 0 ? <EmptyState title="No one invited yet" /> : (
          <ul className="grid gap-3">
            {data.invited.map((m) => (
              <li key={m.id} className="sketch-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{m.display_name} <span className="text-sm font-normal text-muted-foreground">· {m.relationship} · {m.email}</span></p>
                  <Badge variant={m.status === "accepted" ? "explore" : m.status === "revoked" ? "outline" : "secondary"}>{m.status === "pending" ? "Not accepted yet (not emailed)" : m.status}</Badge>
                </div>
                {m.status !== "revoked" && (
                  <div className="flex gap-2">
                    {m.status === "pending" && <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(link(m.invite_token)); toast.success("Private link copied"); }}><Copy aria-hidden /> Copy link</Button>}
                    <Button size="sm" variant="ghost" onClick={() => revoke(m.id)}>Revoke</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {data.memberships.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Circles you belong to</h2>
          <ul className="grid gap-2">{data.memberships.map((m) => <li key={m.id} className="rounded-lg border p-3">{m.parentName} · {m.status}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PrivacyNotice, EmptyState } from "@/components/notice";
import { entryQuery, logAuthorization } from "@/lib/queries";
import { canShareEntry, canUploadMedia } from "@/lib/consents";

export const Route = createFileRoute("/_authenticated/journal/$entryId")({
  head: () => ({
    meta: [
      { title: "Journal entry — Miles OS" },
      { name: "description", content: "A private “Look what I did!” journal entry." },
      { property: "og:title", content: "Journal entry — Miles OS" },
      { property: "og:description", content: "A private family journal entry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(entryQuery(params.entryId)),
  component: EntryPage,
  errorComponent: () => <EmptyState title="This entry isn't available"><Link to="/dashboard" className="underline">Back to dashboard</Link></EmptyState>,
});

function EntryPage() {
  const { entryId } = Route.useParams();
  const { data } = useSuspenseQuery(entryQuery(entryId));
  const { entry, child, consents } = data;
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(entry.title);
  const [reflection, setReflection] = useState(entry.reflection);
  const [childWords, setChildWords] = useState(entry.child_words);
  const [ownMedia, setOwnMedia] = useState(false);
  const [approveShare, setApproveShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["entry", entryId] });

  async function save() {
    const { error } = await supabase.from("journal_entries").update({ title: title.trim() || "Look what I did!", reflection, child_words: childWords }).eq("id", entryId);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    await refresh();
  }

  async function upload(file: File) {
    if (!ownMedia) { toast.error("Please confirm this is your family's own media"); return; }
    setBusy(true);
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    const path = `${entry.parent_id}/${entry.child_id}/${entryId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("journal-media").upload(path, file, { contentType: file.type });
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { error } = await supabase.from("journal_media").insert({ entry_id: entryId, child_id: entry.child_id, parent_id: entry.parent_id, storage_path: path, mime_type: file.type });
    if (error) { await supabase.storage.from("journal-media").remove([path]); setBusy(false); toast.error(error.message); return; }
    await logAuthorization({ action: "media_saved", subjectType: "journal_entry", subjectId: entryId, childId: entry.child_id, details: { own_family_media_attested: true } });
    setBusy(false);
    toast.success("Saved privately");
    await refresh();
  }

  async function removeMedia(id: string, path: string) {
    await supabase.storage.from("journal-media").remove([path]);
    await supabase.from("journal_media").delete().eq("id", id);
    await refresh();
  }

  async function setShared(shared: boolean) {
    if (shared) {
      const check = canShareEntry(consents, approveShare);
      if (!check.ok) { toast.error(check.reason); return; }
    }
    const { error } = await supabase.from("journal_entries").update({ shared_with_circle: shared }).eq("id", entryId);
    if (error) { toast.error(error.message); return; }
    toast.success(shared ? "Shared with your family circle (recorded)" : "No longer shared (recorded)");
    setApproveShare(false);
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={`${child.nickname}'s journal`} title="Look what I did!">
        <Badge variant={entry.shared_with_circle ? "explore" : "secondary"}>{entry.shared_with_circle ? "Shared with circle" : "Private"}</Badge>
      </PageHeader>
      {data.plan && <p className="text-sm">From plan: <Link to="/plans/$planId" params={{ planId: data.plan.id }} className="underline">{data.plan.title}</Link></p>}
      <section className="sketch-card grid gap-4 p-6">
        <div className="grid gap-1.5"><Label htmlFor="j-title">Title</Label><Input id="j-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="j-words">In their own words</Label><Textarea id="j-words" rows={3} value={childWords} onChange={(e) => setChildWords(e.target.value)} placeholder="“I made the boat float with two toys!”" /></div>
        <div className="grid gap-1.5"><Label htmlFor="j-ref">What happened (your notes)</Label><Textarea id="j-ref" rows={4} value={reflection} onChange={(e) => setReflection(e.target.value)} /></div>
        <Button className="justify-self-start" onClick={save}>Save entry</Button>
      </section>

      <section className="sketch-card grid gap-4 p-6" aria-labelledby="media-h">
        <h2 id="media-h" className="text-xl font-semibold">Private photos & recordings</h2>
        {!canUploadMedia(consents) ? (
          <p className="text-sm text-muted-foreground">Media is off for this child. Turn on “Private photos & recordings” in <Link to="/children/$childId" params={{ childId: child.id }} className="underline">Profile & consent</Link>.</p>
        ) : (
          <>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={ownMedia} onCheckedChange={(v) => setOwnMedia(v === true)} aria-label="I confirm this media was made by my family" />
              <span>I confirm this was made by my family — not a video or image from someone else.</span>
            </label>
            <Input type="file" accept="image/*,audio/*,video/*" disabled={busy || !ownMedia} aria-label="Upload media" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
          </>
        )}
        {data.media.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.media.map((m) => (
              <li key={m.id} className="rounded-lg border p-2">
                {m.url && m.mime_type.startsWith("image/") && <img src={m.url} alt="Family journal media" className="w-full rounded-md" />}
                {m.url && m.mime_type.startsWith("video/") && <video src={m.url} controls className="w-full rounded-md" />}
                {m.url && m.mime_type.startsWith("audio/") && <audio src={m.url} controls className="w-full" />}
                <Button variant="ghost" size="sm" onClick={() => removeMedia(m.id, m.storage_path)}><Trash2 aria-hidden /> Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sketch-card grid gap-4 p-6" aria-labelledby="share-h">
        <h2 id="share-h" className="text-xl font-semibold">Share with family circle</h2>
        {entry.shared_with_circle ? (
          <>
            <p className="text-sm">Shared {entry.shared_approved_at ? new Date(entry.shared_approved_at).toLocaleString() : ""} with {data.acceptedCircleCount} accepted member(s).</p>
            <Button variant="outline" className="justify-self-start" onClick={() => setShared(false)}>Stop sharing</Button>
          </>
        ) : !consents.family_circle_sharing ? (
          <p className="text-sm text-muted-foreground">Family circle sharing is off for this child. You can turn it on in Profile & consent.</p>
        ) : (
          <>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={approveShare} onCheckedChange={(v) => setApproveShare(v === true)} aria-label="I approve sharing this entry" />
              <span>I approve sharing this entry's title, words, notes and media with the {data.acceptedCircleCount} people who accepted my invitation.</span>
            </label>
            <Button className="justify-self-start" disabled={!approveShare} onClick={() => setShared(true)}>Share with circle</Button>
          </>
        )}
        <PrivacyNotice title="Never public">There are no feeds or public links. Only invited, accepted members can see shared entries.</PrivacyNotice>
      </section>
    </div>
  );
}
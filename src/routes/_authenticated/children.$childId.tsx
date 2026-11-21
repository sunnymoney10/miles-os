import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Link2, PenLine, Trash2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, PrivacyNotice, EmptyState } from "@/components/notice";
import { SampleBadge, SourceBadge, StatusBadge } from "@/components/badges";
import { InterestPicker } from "@/components/interest-picker";
import { childQuery } from "@/lib/queries";
import { generatePlan } from "@/lib/plans.functions";
import { checkInspirationUrl } from "@/lib/inspiration";
import { CONSENT_COPY, CONSENT_TYPES, CURRENT_POLICY_VERSION, type ConsentType } from "@/lib/consents";
import { AGE_BANDS, type AgeBand } from "@/lib/plan-types";

export const Route = createFileRoute("/_authenticated/children/$childId")({
  head: () => ({
    meta: [
      { title: "Child space — Miles OS" },
      { name: "description", content: "Explore ideas, approve plans and keep a private journal for your child." },
      { property: "og:title", content: "Child space — Miles OS" },
      { property: "og:description", content: "A private space for one child's creative exploration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(childQuery(params.childId)),
  component: ChildHub,
  errorComponent: () => (
    <EmptyState title="This profile isn't available">
      It may have been deleted, or it belongs to another family. <Link to="/dashboard" className="underline">Back to dashboard</Link>
    </EmptyState>
  ),
});

function ChildHub() {
  const { childId } = Route.useParams();
  const { data } = useSuspenseQuery(childQuery(childId));
  const { child, consents } = data;

  return (
    <div>
      <PageHeader eyebrow={`Ages ${child.age_band}`} title={child.nickname}>
        {child.is_sample && <SampleBadge />}
        {consents.ai_plan_generation ? <Badge variant="wonder">AI plan ideas on</Badge> : <Badge variant="demo">Demo templates only</Badge>}
      </PageHeader>
      <Tabs defaultValue="explore">
        <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 rounded-full bg-muted p-1">
          <TabsTrigger value="explore" className="rounded-full">Explore</TabsTrigger>
          <TabsTrigger value="plans" className="rounded-full">Plans ({data.plans.length})</TabsTrigger>
          <TabsTrigger value="journal" className="rounded-full">Journal ({data.entries.length})</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full">Profile & consent</TabsTrigger>
        </TabsList>
        <TabsContent value="explore"><ExploreTab childId={childId} /></TabsContent>
        <TabsContent value="plans"><PlansTab childId={childId} /></TabsContent>
        <TabsContent value="journal"><JournalTab childId={childId} /></TabsContent>
        <TabsContent value="settings"><SettingsTab childId={childId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ExploreTab({ childId }: { childId: string }) {
  const { data } = useSuspenseQuery(childQuery(childId));
  const navigate = useNavigate();
  const generate = useServerFn(generatePlan);
  const [kind, setKind] = useState<"text" | "url">("text");
  const [prompt, setPrompt] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const urlCheck = kind === "url" && url ? checkInspirationUrl(url) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) { toast.error(kind === "url" ? "Say what the link made you wonder" : "Write the idea first"); return; }
    let sourceUrl: string | null = null;
    if (kind === "url") {
      const check = checkInspirationUrl(url);
      if (!check.ok) { toast.error(check.error); return; }
      sourceUrl = check.url;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { data: insp, error } = await supabase
        .from("inspirations")
        .insert({ child_id: childId, parent_id: auth.user.id, kind, prompt: text, source_url: sourceUrl })
        .select("id")
        .single();
      if (error || !insp) throw error ?? new Error("Could not save idea");
      const result = await generate({ data: { inspirationId: insp.id } });
      toast.message(result.notice);
      navigate({ to: "/plans/$planId", params: { planId: result.planId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create a plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={onSubmit} className="sketch-card grid gap-5 p-6" aria-labelledby="inspire-h">
        <div>
          <h2 id="inspire-h" className="text-2xl font-semibold text-wonder">What if…?</h2>
          <p className="text-sm text-muted-foreground">Write down your child's idea in their words, or save a link you found together.</p>
        </div>
        <div role="radiogroup" aria-label="Type of inspiration" className="flex gap-2">
          <Button type="button" role="radio" aria-checked={kind === "text"} variant={kind === "text" ? "default" : "outline"} size="sm" onClick={() => setKind("text")}>
            <PenLine aria-hidden /> An idea
          </Button>
          <Button type="button" role="radio" aria-checked={kind === "url"} variant={kind === "url" ? "default" : "outline"} size="sm" onClick={() => setKind("url")}>
            <Link2 aria-hidden /> A link
          </Button>
        </div>
        {kind === "url" && (
          <div className="grid gap-1.5">
            <Label htmlFor="insp-url">Link</Label>
            <Input id="insp-url" type="url" inputMode="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            {urlCheck && !urlCheck.ok && <p className="text-sm text-destructive">{urlCheck.error}</p>}
            {urlCheck?.ok && urlCheck.isVideoPlatform && (
              <p className="text-sm text-notice-foreground">Saved as a reference only. Miles OS won't download or re-upload this video.</p>
            )}
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="insp-text">{kind === "url" ? "What did it make you wonder?" : "The idea"}</Label>
          <Textarea
            id="insp-text"
            rows={4}
            maxLength={1000}
            placeholder="What if our paper boat could carry a toy across the bath?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <Button type="submit" variant="spark" size="lg" disabled={busy}>
          <Sparkles aria-hidden /> {busy ? "Drafting a plan…" : "Let's find out — draft a plan"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {data.consents.ai_plan_generation
            ? "AI plan ideas are on: only the idea text, age band and interests are sent — never the nickname or the full link."
            : "AI plan ideas are off for this child, so you'll get a demo template. You can change this in Profile & consent."}
        </p>
      </form>

      <section className="sketch-card p-6" aria-labelledby="recent-ideas">
        <h2 id="recent-ideas" className="text-xl font-semibold">Recent ideas</h2>
        {data.inspirations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No ideas yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.inspirations.slice(0, 8).map((i) => (
              <li key={i.id} className="rounded-lg bg-wonder-soft/60 p-3 text-sm">
                <p>{i.prompt}</p>
                {i.source_url && <p className="mt-1 truncate text-xs text-muted-foreground">Reference: {i.source_url}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlansTab({ childId }: { childId: string }) {
  const { data } = useSuspenseQuery(childQuery(childId));
  if (data.plans.length === 0) return <EmptyState title="No plans yet">Start from the Explore tab with a “What if?”.</EmptyState>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {data.plans.map((p) => (
        <li key={p.id}>
          <Link to="/plans/$planId" params={{ planId: p.id }} className="sketch-card block p-5 hover:shadow-lift">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={p.status} />
              <SourceBadge source={p.source} />
            </div>
            <h3 className="mt-2 text-lg font-semibold">{p.title}</h3>
            <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function JournalTab({ childId }: { childId: string }) {
  const { data } = useSuspenseQuery(childQuery(childId));
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function newEntry() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data: entry, error } = await supabase
      .from("journal_entries")
      .insert({ child_id: childId, parent_id: auth.user?.id ?? "", title: "Look what I did!" })
      .select("id")
      .single();
    setBusy(false);
    if (error || !entry) { toast.error(error?.message ?? "Could not create entry"); return; }
    navigate({ to: "/journal/$entryId", params: { entryId: entry.id } });
  }

  return (
    <div className="grid gap-4">
      <div>
        <Button onClick={newEntry} disabled={busy} variant="outline"><BookOpen aria-hidden /> New journal entry</Button>
      </div>
      {data.entries.length === 0 ? (
        <EmptyState title="The journal is empty">Finish a plan or add an entry for anything your child made.</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.entries.map((e) => (
            <li key={e.id}>
              <Link to="/journal/$entryId" params={{ entryId: e.id }} className="sketch-card block p-5 hover:shadow-lift">
                <Badge variant={e.shared_with_circle ? "explore" : "secondary"}>{e.shared_with_circle ? "Shared with circle" : "Private"}</Badge>
                <h3 className="mt-2 text-lg font-semibold">{e.title}</h3>
                <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsTab({ childId }: { childId: string }) {
  const { data } = useSuspenseQuery(childQuery(childId));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(data.child.nickname);
  const [ageBand, setAgeBand] = useState<AgeBand>(data.child.age_band as AgeBand);
  const [interests, setInterests] = useState<string[]>(data.child.interests);
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["child", childId] });

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("children").update({ nickname: nickname.trim(), age_band: ageBand, interests }).eq("id", childId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ["dashboard"] })]);
  }

  async function setConsent(type: ConsentType, granted: boolean) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("child_consents")
      .upsert(
        { child_id: childId, parent_id: auth.user?.id ?? "", consent_type: type, granted, policy_version: CURRENT_POLICY_VERSION },
        { onConflict: "child_id,consent_type" },
      );
    if (error) { toast.error(error.message); return; }
    toast.success(`${CONSENT_COPY[type].label}: ${granted ? "on" : "off"} (recorded)`);
    await refresh();
  }

  async function deleteChild() {
    const { data: media } = await supabase.from("journal_media").select("storage_path").eq("child_id", childId);
    const paths = (media ?? []).map((m) => m.storage_path);
    if (paths.length) await supabase.storage.from("journal-media").remove(paths);
    const { error } = await supabase.from("children").delete().eq("id", childId);
    if (error) { toast.error(error.message); return; }
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Profile and all its records were deleted");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="sketch-card grid gap-4 p-6">
        <h2 className="text-xl font-semibold">Profile</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-nick">Nickname</Label>
          <Input id="edit-nick" value={nickname} maxLength={40} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-age">Age band</Label>
          <Select value={ageBand} onValueChange={(v) => setAgeBand(v as AgeBand)}>
            <SelectTrigger id="edit-age"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AGE_BANDS.map((b) => <SelectItem key={b} value={b}>Ages {b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-int">Interests</Label>
          <InterestPicker id="edit-int" value={interests} onChange={setInterests} />
        </div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
      </form>

      <section className="sketch-card grid gap-4 p-6" aria-labelledby="consents-h">
        <h2 id="consents-h" className="text-xl font-semibold">Consents</h2>
        {CONSENT_TYPES.map((t) => (
          <div key={t} className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor={`s-${t}`} className="font-semibold">{CONSENT_COPY[t].label}</Label>
              <p className="mt-1 text-sm text-muted-foreground">{CONSENT_COPY[t].description}</p>
            </div>
            <Switch
              id={`s-${t}`}
              checked={data.consents[t]}
              disabled={CONSENT_COPY[t].required}
              onCheckedChange={(v) => setConsent(t, v)}
            />
          </div>
        ))}
        <PrivacyNotice title="Turning sharing off">
          Turning off family sharing stops new shares. To hide something already shared, open the entry and choose “Stop sharing”.
        </PrivacyNotice>
      </section>

      <section className="sketch-card p-6 lg:col-span-2" aria-labelledby="danger-h">
        <h2 id="danger-h" className="text-xl font-semibold">Delete this profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Removes the profile, consents, ideas, plans, journal entries and all private media. Your records log keeps a note that it happened.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4"><Trash2 aria-hidden /> Delete profile</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {data.child.nickname}'s profile?</AlertDialogTitle>
              <AlertDialogDescription>This permanently deletes everything for this child. It cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep profile</AlertDialogCancel>
              <AlertDialogAction onClick={deleteChild}>Delete everything</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
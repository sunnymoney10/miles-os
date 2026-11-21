import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2, CheckCircle2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, PrivacyNotice, EmptyState } from "@/components/notice";
import { SourceBadge, StatusBadge } from "@/components/badges";
import { planQuery } from "@/lib/queries";
import { PHASE_LABELS, PLAN_PHASES, type PlanPhase, type PlanStep } from "@/lib/plan-types";

export const Route = createFileRoute("/_authenticated/plans/$planId")({
  head: () => ({
    meta: [
      { title: "Review a plan — Miles OS" },
      { name: "description", content: "Edit and approve an exploration plan before your child starts." },
      { property: "og:title", content: "Review a plan — Miles OS" },
      { property: "og:description", content: "Parent review and approval of an exploration plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(planQuery(params.planId)),
  component: PlanPage,
  errorComponent: () => <EmptyState title="This plan isn't available"><Link to="/dashboard" className="underline">Back to dashboard</Link></EmptyState>,
});

function PlanPage() {
  const { planId } = Route.useParams();
  const { data } = useSuspenseQuery(planQuery(planId));
  const { plan, child } = data;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState(plan.title);
  const [whatIf, setWhatIf] = useState(plan.what_if);
  const [steps, setSteps] = useState<PlanStep[]>(plan.steps);
  const [materials, setMaterials] = useState(plan.materials.join("\n"));
  const [notes, setNotes] = useState(plan.grown_up_notes);
  const [busy, setBusy] = useState(false);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["plan", planId] }), queryClient.invalidateQueries({ queryKey: ["child", plan.child_id] }), queryClient.invalidateQueries({ queryKey: ["dashboard"] })]);

  async function update(patch: Record<string, unknown>, msg: string) {
    setBusy(true);
    const { error } = await supabase.from("plans").update(patch).eq("id", planId);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success(msg);
    await refresh();
    return true;
  }

  const content = {
    title: title.trim() || "Untitled plan",
    what_if: whatIf,
    steps: steps.filter((s) => s.text.trim()) as unknown as Json,
    materials: materials.split("\n").map((m) => m.trim()).filter(Boolean),
    grown_up_notes: notes,
  };

  async function complete() {
    const ok = await update({ status: "completed" }, "Marked as done");
    if (!ok) return;
    if (data.entry) { navigate({ to: "/journal/$entryId", params: { entryId: data.entry.id } }); return; }
    const { data: auth } = await supabase.auth.getUser();
    const { data: entry, error } = await supabase.from("journal_entries").insert({ child_id: plan.child_id, parent_id: auth.user?.id ?? "", plan_id: planId, title: plan.title }).select("id").single();
    if (error || !entry) { toast.error(error?.message ?? "Could not create journal entry"); return; }
    navigate({ to: "/journal/$entryId", params: { entryId: entry.id } });
  }

  const move = (i: number, d: number) => setSteps((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; const a = n[i]!; n[i] = n[j]!; n[j] = a; return n; });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={`Plan for ${child.nickname}`} title={plan.title}>
        <StatusBadge status={plan.status} />
        <SourceBadge source={plan.source} />
      </PageHeader>
      {plan.source === "demo_template" && <PrivacyNotice title="Demo template" className="mb-6">Written by Miles OS rules, not AI. Edit freely before approving.</PrivacyNotice>}
      {data.inspiration?.source_url && <p className="mb-4 text-sm text-muted-foreground">Reference link (not downloaded): {data.inspiration.source_url}</p>}
      <div className="sketch-card grid gap-5 p-6">
        <div className="grid gap-1.5"><Label htmlFor="p-title">Title</Label><Input id="p-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="p-whatif">What if…?</Label><Textarea id="p-whatif" rows={2} value={whatIf} onChange={(e) => setWhatIf(e.target.value)} /></div>
        <fieldset className="grid gap-3">
          <legend className="mb-2 font-semibold">Steps</legend>
          {steps.map((s, i) => (
            <div key={s.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_auto]">
              <Select value={s.phase} onValueChange={(v) => setSteps((all) => all.map((x) => (x.id === s.id ? { ...x, phase: v as PlanPhase } : x)))}>
                <SelectTrigger aria-label={`Phase for step ${i + 1}`}><SelectValue /></SelectTrigger>
                <SelectContent>{PLAN_PHASES.map((p) => <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea aria-label={`Step ${i + 1}`} rows={2} maxLength={400} value={s.text} onChange={(e) => setSteps((all) => all.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))} />
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Remove step" onClick={() => setSteps((all) => all.filter((x) => x.id !== s.id))}><Trash2 /></Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setSteps((s) => [...s, { id: `s${Date.now()}`, phase: "explore", text: "" }])}><Plus aria-hidden /> Add step</Button>
        </fieldset>
        <div className="grid gap-1.5"><Label htmlFor="p-mat">Materials (one per line)</Label><Textarea id="p-mat" rows={3} value={materials} onChange={(e) => setMaterials(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="p-notes">Grown-up notes</Label><Textarea id="p-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {plan.status === "approved" && <p className="text-sm text-muted-foreground">Saving content changes sends the plan back for re-approval.</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => update(content, "Changes saved")}>Save changes</Button>
          {plan.status === "draft" && <Button disabled={busy} onClick={() => update({ ...content, status: "approved" }, "Plan approved")}><CheckCircle2 aria-hidden /> Save & approve</Button>}
          {(plan.status === "approved" || plan.status === "completed") && <Button variant="spark" disabled={busy} onClick={complete}><Star aria-hidden /> We did it! Open journal</Button>}
        </div>
      </div>
    </div>
  );
}
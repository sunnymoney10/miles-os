import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, PrivacyNotice } from "@/components/notice";
import { InterestPicker } from "@/components/interest-picker";
import { AGE_BANDS, type AgeBand } from "@/lib/plan-types";
import { CONSENT_COPY, CONSENT_TYPES, CURRENT_POLICY_VERSION, type ConsentMap } from "@/lib/consents";
import { logAuthorization } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/children/new")({
  head: () => ({
    meta: [
      { title: "Add a child profile — Miles OS" },
      { name: "description", content: "Create a private, nickname-only child profile with interests and consents." },
      { property: "og:title", content: "Add a child profile — Miles OS" },
      { property: "og:description", content: "Private, nickname-only child profiles managed by parents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewChild,
});

function NewChild() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("6-8");
  const [interests, setInterests] = useState<string[]>([]);
  const [consents, setConsents] = useState<ConsentMap>({
    profile_storage: false,
    ai_plan_generation: false,
    media_storage: false,
    family_circle_sharing: false,
  });
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) { toast.error("Add a nickname"); return; }
    if (!consents.profile_storage) { toast.error("Profile storage consent is required to save a profile"); return; }
    if (!guardian) { toast.error("Please confirm you are this child's parent or legal guardian"); return; }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { data: child, error } = await supabase
        .from("children")
        .insert({ parent_id: auth.user.id, nickname: nickname.trim(), age_band: ageBand, interests })
        .select("id")
        .single();
      if (error || !child) throw error ?? new Error("Could not save");
      const { error: cErr } = await supabase.from("child_consents").insert(
        CONSENT_TYPES.map((t) => ({
          child_id: child.id,
          parent_id: auth.user.id,
          consent_type: t,
          granted: consents[t],
          policy_version: CURRENT_POLICY_VERSION,
        })),
      );
      if (cErr) throw cErr;
      await logAuthorization({
        action: "child_profile_created",
        subjectType: "child",
        subjectId: child.id,
        childId: child.id,
        details: { guardian_attested: true, policy_version: CURRENT_POLICY_VERSION },
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Profile saved");
      navigate({ to: "/children/$childId", params: { childId: child.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="New profile" title="Add a child" />
      <form onSubmit={onSubmit} className="grid gap-6">
        <section className="sketch-card grid gap-5 p-6">
          <div className="grid gap-1.5">
            <Label htmlFor="nickname">Nickname</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} required aria-describedby="nickname-hint" />
            <p id="nickname-hint" className="text-xs text-muted-foreground">Use a nickname or first initial — not a full name.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="age">Age band</Label>
            <Select value={ageBand} onValueChange={(v) => setAgeBand(v as AgeBand)}>
              <SelectTrigger id="age"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGE_BANDS.map((b) => (
                  <SelectItem key={b} value={b}>Ages {b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">We never ask for a birthday.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="interests">Interests</Label>
            <InterestPicker id="interests" value={interests} onChange={setInterests} />
          </div>
        </section>

        <section className="sketch-card grid gap-4 p-6" aria-labelledby="consent-h">
          <div>
            <h2 id="consent-h" className="text-xl font-semibold">Consents</h2>
            <p className="text-sm text-muted-foreground">Optional consents start off. You can change them any time; every change is recorded.</p>
          </div>
          {CONSENT_TYPES.map((t) => (
            <div key={t} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label htmlFor={`c-${t}`} className="font-semibold">
                  {CONSENT_COPY[t].label} {CONSENT_COPY[t].required && <span className="text-destructive">(required)</span>}
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">{CONSENT_COPY[t].description}</p>
              </div>
              <Switch id={`c-${t}`} checked={consents[t]} onCheckedChange={(v) => setConsents((c) => ({ ...c, [t]: v }))} />
            </div>
          ))}
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={guardian} onCheckedChange={(v) => setGuardian(v === true)} aria-label="I confirm I am this child's parent or legal guardian" />
            <span>I am this child's parent or legal guardian and I authorise these choices.</span>
          </label>
        </section>

        <PrivacyNotice title="Private to you">
          This profile is never public and never visible to your family circle. Only entries you approve can be shared.
        </PrivacyNotice>

        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toConsentMap } from "./consents";
import { parseSteps } from "./plan-types";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function must<T>(result: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Not found");
  return result.data as NonNullable<T>;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Not signed in");
    const profile = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      displayName: profile.data?.display_name || data.user.email?.split("@")[0] || "Parent",
    };
  },
});

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => {
    const uid = await currentUserId();
    const [children, drafts, entries, circle] = await Promise.all([
      supabase.from("children").select("id, nickname, age_band, interests, is_sample, created_at").eq("parent_id", uid).order("created_at"),
      supabase.from("plans").select("id, title, child_id, status, source, created_at").eq("parent_id", uid).eq("status", "draft").order("created_at", { ascending: false }).limit(5),
      supabase.from("journal_entries").select("id, title, child_id, shared_with_circle, created_at").eq("parent_id", uid).order("created_at", { ascending: false }).limit(5),
      supabase.from("circle_members").select("id, status").eq("parent_id", uid),
    ]);
    return {
      children: must(children),
      drafts: must(drafts),
      entries: must(entries),
      circle: must(circle),
    };
  },
});

export const childQuery = (childId: string) =>
  queryOptions({
    queryKey: ["child", childId],
    queryFn: async () => {
      const [child, consents, inspirations, plans, entries] = await Promise.all([
        supabase.from("children").select("*").eq("id", childId).maybeSingle(),
        supabase.from("child_consents").select("consent_type, granted, updated_at, policy_version").eq("child_id", childId),
        supabase.from("inspirations").select("*").eq("child_id", childId).order("created_at", { ascending: false }).limit(20),
        supabase.from("plans").select("id, title, status, source, created_at, inspiration_id").eq("child_id", childId).order("created_at", { ascending: false }),
        supabase.from("journal_entries").select("id, title, shared_with_circle, created_at, plan_id").eq("child_id", childId).order("created_at", { ascending: false }),
      ]);
      const c = must(child);
      const consentRows = must(consents);
      return {
        child: c,
        consents: toConsentMap(consentRows),
        consentRows,
        inspirations: must(inspirations),
        plans: must(plans),
        entries: must(entries),
      };
    },
  });

export const planQuery = (planId: string) =>
  queryOptions({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const plan = must(await supabase.from("plans").select("*").eq("id", planId).maybeSingle());
      const child = must(await supabase.from("children").select("id, nickname").eq("id", plan.child_id).maybeSingle());
      const inspiration = plan.inspiration_id
        ? (await supabase.from("inspirations").select("kind, prompt, source_url").eq("id", plan.inspiration_id).maybeSingle()).data
        : null;
      const entry = (await supabase.from("journal_entries").select("id").eq("plan_id", planId).limit(1).maybeSingle()).data;
      return { plan: { ...plan, steps: parseSteps(plan.steps) }, child, inspiration, entry };
    },
  });

export interface MediaItem {
  id: string;
  storage_path: string;
  mime_type: string;
  caption: string;
  url: string | null;
}

async function signMedia(rows: Array<Omit<MediaItem, "url">>): Promise<MediaItem[]> {
  if (rows.length === 0) return [];
  const { data } = await supabase.storage.from("journal-media").createSignedUrls(rows.map((r) => r.storage_path), 3600);
  return rows.map((r) => ({ ...r, url: data?.find((d) => d.path === r.storage_path)?.signedUrl ?? null }));
}

export const entryQuery = (entryId: string) =>
  queryOptions({
    queryKey: ["entry", entryId],
    queryFn: async () => {
      const entry = must(await supabase.from("journal_entries").select("*").eq("id", entryId).maybeSingle());
      const [child, consents, media, circle] = await Promise.all([
        supabase.from("children").select("id, nickname").eq("id", entry.child_id).maybeSingle(),
        supabase.from("child_consents").select("consent_type, granted").eq("child_id", entry.child_id),
        supabase.from("journal_media").select("id, storage_path, mime_type, caption").eq("entry_id", entryId).order("created_at"),
        supabase.from("circle_members").select("id, status").eq("parent_id", entry.parent_id).eq("status", "accepted"),
      ]);
      const plan = entry.plan_id
        ? (await supabase.from("plans").select("id, title").eq("id", entry.plan_id).maybeSingle()).data
        : null;
      return {
        entry,
        child: must(child),
        consents: toConsentMap(must(consents)),
        media: await signMedia(must(media)),
        acceptedCircleCount: (circle.data ?? []).length,
        plan,
      };
    },
  });

export const circleQuery = queryOptions({
  queryKey: ["circle"],
  queryFn: async () => {
    const uid = await currentUserId();
    const invited = must(
      await supabase.from("circle_members").select("*").eq("parent_id", uid).order("created_at", { ascending: false }),
    );
    const memberships = must(
      await supabase.from("circle_members").select("id, parent_id, status, accepted_at").eq("member_user_id", uid),
    );
    const parentIds = memberships.map((m) => m.parent_id);
    const profiles = parentIds.length
      ? must(await supabase.from("profiles").select("id, display_name").in("id", parentIds))
      : [];
    return {
      invited,
      memberships: memberships.map((m) => ({
        ...m,
        parentName: profiles.find((p) => p.id === m.parent_id)?.display_name || "A family",
      })),
    };
  },
});

export const sharedQuery = queryOptions({
  queryKey: ["shared"],
  queryFn: async () => {
    const uid = await currentUserId();
    // Row-level rules only return entries a parent explicitly shared with a circle you joined.
    const entries = must(
      await supabase
        .from("journal_entries")
        .select("id, parent_id, title, reflection, child_words, shared_approved_at")
        .neq("parent_id", uid)
        .eq("shared_with_circle", true)
        .order("shared_approved_at", { ascending: false }),
    );
    const parentIds = [...new Set(entries.map((e) => e.parent_id))];
    const profiles = parentIds.length
      ? must(await supabase.from("profiles").select("id, display_name").in("id", parentIds))
      : [];
    const media = entries.length
      ? must(
          await supabase
            .from("journal_media")
            .select("id, entry_id, storage_path, mime_type, caption")
            .in("entry_id", entries.map((e) => e.id)),
        )
      : [];
    const signed = await signMedia(media.map(({ entry_id: _e, ...m }) => m));
    return entries.map((e) => ({
      ...e,
      parentName: profiles.find((p) => p.id === e.parent_id)?.display_name || "A family",
      media: signed.filter((m) => media.find((x) => x.id === m.id)?.entry_id === e.id),
    }));
  },
});

export const recordsQuery = queryOptions({
  queryKey: ["records"],
  queryFn: async () => {
    const uid = await currentUserId();
    const [log, children] = await Promise.all([
      supabase.from("authorization_log").select("*").eq("parent_id", uid).order("created_at", { ascending: false }).limit(200),
      supabase.from("children").select("id, nickname").eq("parent_id", uid),
    ]);
    return { log: must(log), children: must(children) };
  },
});

/** Records an explicit parent authorization in the append-only log. */
export async function logAuthorization(entry: {
  action: string;
  subjectType: string;
  subjectId?: string;
  childId?: string;
  details?: Record<string, string | number | boolean>;
}) {
  const uid = await currentUserId();
  await supabase.from("authorization_log").insert({
    parent_id: uid,
    action: entry.action,
    subject_type: entry.subjectType,
    ...(entry.subjectId ? { subject_id: entry.subjectId } : {}),
    ...(entry.childId ? { child_id: entry.childId } : {}),
    details: entry.details ?? {},
  });
}
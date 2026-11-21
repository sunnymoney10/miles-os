import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/notice";
import { recordsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({
    meta: [
      { title: "Records — Miles OS" },
      { name: "description", content: "Every consent, approval and sharing decision you've made, with timestamps." },
      { property: "og:title", content: "Records — Miles OS" },
      { property: "og:description", content: "Your append-only authorization history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(recordsQuery),
  component: RecordsPage,
});

const LABELS: Record<string, string> = {
  consent_granted: "Consent given",
  consent_withheld: "Consent off",
  plan_approved: "Plan approved",
  plan_completed: "Plan completed",
  entry_shared_with_circle: "Entry shared with circle",
  entry_unshared: "Entry un-shared",
  media_saved: "Media saved privately",
  child_profile_created: "Child profile created",
  sample_profile_created: "Sample profile created",
  circle_invite_accepted: "Circle invitation accepted",
};

function RecordsPage() {
  const { data } = useSuspenseQuery(recordsQuery);
  const name = (id: string | null) => data.children.find((c) => c.id === id)?.nickname ?? (id ? "Deleted profile" : "—");
  function exportJson() {
    const blob = new Blob([JSON.stringify(data.log, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "miles-os-records.json";
    a.click();
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Append-only" title="Records">
        <Button variant="outline" onClick={exportJson}>Export JSON</Button>
      </PageHeader>
      {data.log.length === 0 ? <EmptyState title="No records yet" /> : (
        <ol className="grid gap-2">
          {data.log.map((r) => {
            const d = r.details as Record<string, unknown> | null;
            const extra = d ? String(d["consent_type"] ?? d["title"] ?? d["display_name"] ?? "") : "";
            return (
              <li key={r.id} className="rounded-lg border bg-card p-3 text-sm">
                <p className="font-semibold">{LABELS[r.action] ?? r.action}{extra ? ` · ${extra}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {name(r.child_id)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles, Users, BookOpen, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PrivacyNotice, EmptyState } from "@/components/notice";
import { SampleBadge, StatusBadge } from "@/components/badges";
import { dashboardQuery, meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Parent dashboard — Miles OS" },
      { name: "description", content: "Your children's profiles, plans awaiting approval and recent journal moments." },
      { property: "og:title", content: "Parent dashboard — Miles OS" },
      { property: "og:description", content: "Your private family dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(dashboardQuery), context.queryClient.ensureQueryData(meQuery)]),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creatingSample, setCreatingSample] = useState(false);
  const childName = (id: string) => data.children.find((c) => c.id === id)?.nickname ?? "Child";
  const accepted = data.circle.filter((c) => c.status === "accepted").length;
  const pending = data.circle.filter((c) => c.status === "pending").length;

  async function createSample() {
    setCreatingSample(true);
    const { data: childId, error } = await supabase.rpc("create_sample_child");
    setCreatingSample(false);
    if (error || !childId) {
      toast.error(error?.message ?? "Could not create sample");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Sample child created — clearly marked as sample data");
    navigate({ to: "/children/$childId", params: { childId } });
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Parent dashboard" title={`Hello, ${me.displayName}`}>
        <Button asChild>
          <Link to="/children/new"><Plus aria-hidden /> Add a child</Link>
        </Button>
        <Button variant="outline" onClick={createSample} disabled={creatingSample}>
          {creatingSample ? "Creating…" : "Try with sample data"}
        </Button>
      </PageHeader>

      <section aria-labelledby="kids">
        <h2 id="kids" className="mb-4 text-2xl font-semibold">Your explorers</h2>
        {data.children.length === 0 ? (
          <EmptyState title="No child profiles yet">
            Add a child with a nickname, age band and interests — or try a sample profile first.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.children.map((c) => (
              <li key={c.id}>
                <Link
                  to="/children/$childId"
                  params={{ childId: c.id }}
                  className="sketch-card block h-full p-5 transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-semibold">{c.nickname}</h3>
                    {c.is_sample && <SampleBadge />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Ages {c.age_band}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.interests.slice(0, 5).map((i) => (
                      <Badge key={i} variant="secondary">{i}</Badge>
                    ))}
                  </div>
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-spark">
                    <Sparkles className="size-4" aria-hidden /> Start a “What if?”
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="approve" className="sketch-card p-5">
          <h2 id="approve" className="flex items-center gap-2 text-xl font-semibold">
            <ClipboardCheck className="size-5 text-primary" aria-hidden /> Waiting for your approval
          </h2>
          {data.drafts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No draft plans right now.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {data.drafts.map((p) => (
                <li key={p.id} className="py-2">
                  <Link to="/plans/$planId" params={{ planId: p.id }} className="block hover:underline">
                    <span className="font-semibold">{p.title}</span>
                    <span className="block text-xs text-muted-foreground">{childName(p.child_id)}</span>
                  </Link>
                  <div className="mt-1"><StatusBadge status={p.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent" className="sketch-card p-5">
          <h2 id="recent" className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="size-5 text-primary" aria-hidden /> Recent journal
          </h2>
          {data.entries.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">“Look what I did!” moments will appear here.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {data.entries.map((e) => (
                <li key={e.id} className="py-2">
                  <Link to="/journal/$entryId" params={{ entryId: e.id }} className="block hover:underline">
                    <span className="font-semibold">{e.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {childName(e.child_id)} · {e.shared_with_circle ? "Shared with circle" : "Private"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="circle" className="sketch-card p-5">
          <h2 id="circle" className="flex items-center gap-2 text-xl font-semibold">
            <Users className="size-5 text-primary" aria-hidden /> Family circle
          </h2>
          <p className="mt-3 text-sm">
            {accepted} joined · {pending} waiting to accept
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/circle">Manage circle</Link>
          </Button>
        </section>
      </div>

      <PrivacyNotice title="You're in control">
        Child profiles are private to you. Plans need your approval, media needs your consent, and nothing is shared unless you approve
        each entry. See every decision on the <Link to="/records" className="underline">Records</Link> page.
      </PrivacyNotice>
    </div>
  );
}
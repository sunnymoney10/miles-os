import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Search, Star, Lock, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { PhaseBadge, SourceBadge, SampleBadge } from "@/components/badges";
import { buildTemplatePlan } from "@/lib/plan-templates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Miles OS — What if? Let's find out. Look what I did!" },
      {
        name: "description",
        content:
          "A private, parent-led space where children explore creative ideas freely. Plans you approve, a private family journal, no feeds and no public profiles.",
      },
      { property: "og:title", content: "Miles OS — parent-led creative exploration" },
      { property: "og:description", content: "Turn a child's “What if?” into a playful plan you approve, then save the “Look what I did!” moment privately." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const sample = buildTemplatePlan({
  prompt: "What if our paper boat could carry a toy across the bath?",
  ageBand: "6-8",
  interests: ["boats", "building"],
});

const PROMISE = [
  { icon: Sparkles, title: "What if?", text: "Your child brings an idea — a question, a picture, a link you found together.", tone: "bg-wonder-soft text-wonder" },
  { icon: Search, title: "Let's find out", text: "Miles OS drafts a playful plan. You edit it and approve it before anything starts.", tone: "bg-explore-soft text-explore" },
  { icon: Star, title: "Look what I did!", text: "Save the moment in a private journal. Share only what you choose, with people you invite.", tone: "bg-show-soft text-accent-foreground" },
];

const NEVER = [
  "No public child profiles, feeds, likes or followers",
  "No scores, rankings or performance pressure",
  "No selling or monetising children's data",
  "No automatic submissions to contests, castings or agencies",
  "No downloading or re-uploading other people's videos",
  "Nothing shared without a parent's explicit approval",
];

function Landing() {
  return (
    <div className="min-h-screen paper-grain">
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">For parents of curious kids</p>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] sm:text-6xl">
              <span className="text-wonder">What if?</span>
              <br />
              <span className="text-explore">Let's find out.</span>
              <br />
              <span className="ink-underline">Look what I did!</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Miles OS is a private, parent-led space for childhood creative exploration. Your child explores freely; you stay in charge of
              every plan, photo and share.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="spark">
                <Link to="/auth">Start as a parent</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/privacy">Read the privacy promise</Link>
              </Button>
            </div>
          </div>

          <article className="sketch-card relative rotate-[0.6deg] p-6" aria-label="Sample plan preview">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SampleBadge />
              <SourceBadge source={sample.source} />
            </div>
            <p className="font-display text-sm italic text-muted-foreground">{sample.whatIf}</p>
            <h2 className="mt-1 text-2xl font-semibold">{sample.title}</h2>
            <ol className="mt-4 space-y-3">
              {sample.steps.map((s, i) => (
                <li key={s.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                  <div className="space-y-1">
                    <PhaseBadge phase={s.phase} />
                    <p className="text-sm leading-relaxed">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="border-y bg-paper/70" aria-labelledby="how">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="how" className="text-3xl font-semibold">How it works</h2>
            <ol className="mt-8 grid gap-5 md:grid-cols-3">
              {PROMISE.map((p) => (
                <li key={p.title} className="sketch-card p-6">
                  <span className={`inline-flex size-11 items-center justify-center rounded-full ${p.tone}`}>
                    <p.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-muted-foreground">{p.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2" aria-labelledby="never">
          <div>
            <h2 id="never" className="text-3xl font-semibold">What Miles OS will never do</h2>
            <p className="mt-3 text-muted-foreground">
              The parent is the customer. The child is the reason. Every rule below is built into how the data is stored, not just promised.
            </p>
          </div>
          <ul className="grid gap-3">
            {NEVER.map((n) => (
              <li key={n} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-explore" aria-hidden />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="sketch-card flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <Lock className="size-6 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="text-2xl font-semibold">Private by default</h2>
                <p className="mt-1 text-muted-foreground">Children don't get accounts. Parents create nickname-only profiles and decide every consent.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Users className="size-6 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="text-2xl font-semibold">A small family circle</h2>
                <p className="mt-1 text-muted-foreground">Invite grandparents or close family. They see only entries you approve.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Miles OS MVP · Sample plans on this page are demo data ·{" "}
        <Link to="/privacy" className="underline">Privacy</Link>
      </footer>
    </div>
  );
}
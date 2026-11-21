import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/public-header";
import { CONSENT_COPY, CONSENT_TYPES, CURRENT_POLICY_VERSION } from "@/lib/consents";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy promise — Miles OS" },
      { name: "description", content: "How Miles OS protects children's information: parent control, consent, private storage and no public profiles." },
      { property: "og:title", content: "Privacy promise — Miles OS" },
      { property: "og:description", content: "Parent control, explicit consent, private storage, no public child profiles." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen paper-grain">
      <PublicHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Policy version {CURRENT_POLICY_VERSION}</p>
        <h1 className="mt-2 text-4xl font-semibold">Our privacy promise</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          This is an early MVP. Plain-language summary of how it works today — not legal advice and not a final policy.
        </p>

        <div className="mt-10 space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold">Who uses Miles OS</h2>
            <p className="mt-2">Only adults (parents or legal guardians) create accounts. Children never sign in, never have accounts, and never have public profiles.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">What we store about a child</h2>
            <p className="mt-2">A nickname (please don't use a full name), an age band, and interests you choose. We don't ask for birthdays, schools, locations or photos of faces. Plans, journal notes and media are stored in your private family space.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Consents you control</h2>
            <ul className="mt-3 space-y-3">
              {CONSENT_TYPES.map((t) => (
                <li key={t} className="rounded-xl border bg-card p-4">
                  <p className="font-semibold">{CONSENT_COPY[t].label}{CONSENT_COPY[t].required ? " (required)" : " (optional, off by default)"}</p>
                  <p className="text-sm text-muted-foreground">{CONSENT_COPY[t].description}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">Every consent change, plan approval and sharing decision is saved in your Records page with a timestamp.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">AI</h2>
            <p className="mt-2">If you turn on AI plan ideas, we send only the idea text, the age band and the interests — never the nickname. For links, only the website name is sent. If AI is off or unavailable, we use built-in demo templates and label them clearly.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Links and other people's content</h2>
            <p className="mt-2">Inspiration links are saved as references only. We never download, copy or re-upload videos or content from other sites. Only upload photos and recordings your own family made.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Sharing</h2>
            <p className="mt-2">There are no feeds and nothing is public. You can invite people into a private family circle; they see only the specific journal entries you approve, and you can un-share at any time. We don't send invitation emails yet — you share the private link yourself.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">What we never do</h2>
            <p className="mt-2">We don't sell or monetise children's data, show ads, scrape information about minors, or submit anything to contests, castings or agencies.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Your controls</h2>
            <p className="mt-2">You can export your records and delete a child profile (with all its plans, journal entries and media) at any time from the app.</p>
          </section>
        </div>
        <p className="mt-12"><Link to="/" className="underline">Back to home</Link></p>
      </main>
    </div>
  );
}
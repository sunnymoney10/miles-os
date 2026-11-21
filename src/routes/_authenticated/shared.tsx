import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader, PrivacyNotice, EmptyState } from "@/components/notice";
import { sharedQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/shared")({
  head: () => ({
    meta: [
      { title: "Shared with me — Miles OS" },
      { name: "description", content: "Journal moments families have approved to share with you." },
      { property: "og:title", content: "Shared with me — Miles OS" },
      { property: "og:description", content: "Private moments shared with your family circle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(sharedQuery),
  component: SharedPage,
});

function SharedPage() {
  const { data } = useSuspenseQuery(sharedQuery);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Family circle" title="Shared with me" />
      <PrivacyNotice title="Please keep these private">These moments were approved for you only. Please don't screenshot or repost them.</PrivacyNotice>
      {data.length === 0 ? <EmptyState title="Nothing shared with you yet">When a family you joined approves an entry, it appears here.</EmptyState> : (
        <ul className="grid gap-4">
          {data.map((e) => (
            <li key={e.id} className="sketch-card p-5">
              <p className="text-xs text-muted-foreground">From {e.parentName}'s family</p>
              <h2 className="text-xl font-semibold">{e.title}</h2>
              {e.child_words && <blockquote className="mt-2 border-l-4 border-spark pl-3 italic">{e.child_words}</blockquote>}
              {e.reflection && <p className="mt-2 text-sm">{e.reflection}</p>}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {e.media.map((m) => m.url && (m.mime_type.startsWith("image/") ? <img key={m.id} src={m.url} alt="Shared family moment" className="rounded-md" /> : m.mime_type.startsWith("video/") ? <video key={m.id} src={m.url} controls className="rounded-md" /> : <audio key={m.id} src={m.url} controls />))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
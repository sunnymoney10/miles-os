import { Badge } from "@/components/ui/badge";
import { PHASE_LABELS, type PlanPhase } from "@/lib/plan-types";

export function PhaseBadge({ phase }: { phase: PlanPhase }) {
  return <Badge variant={phase}>{PHASE_LABELS[phase]}</Badge>;
}

export function SourceBadge({ source }: { source: string }) {
  return source === "ai" ? (
    <Badge variant="wonder" title="Drafted by AI. Review before approving.">AI draft</Badge>
  ) : (
    <Badge variant="demo" title="Written by Miles OS rules, not AI.">Demo template</Badge>
  );
}

const STATUS: Record<string, { label: string; variant: "secondary" | "explore" | "show" | "outline" }> = {
  draft: { label: "Needs your approval", variant: "secondary" },
  approved: { label: "Approved", variant: "explore" },
  completed: { label: "Done", variant: "show" },
  archived: { label: "Archived", variant: "outline" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function SampleBadge() {
  return <Badge variant="demo">Sample data</Badge>;
}
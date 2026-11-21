import { z } from "zod";

export const PLAN_PHASES = ["wonder", "explore", "show"] as const;
export type PlanPhase = (typeof PLAN_PHASES)[number];

export const PHASE_LABELS: Record<PlanPhase, string> = {
  wonder: "What if?",
  explore: "Let's find out",
  show: "Look what I did!",
};

export const AGE_BANDS = ["3-5", "6-8", "9-12", "13-15"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function isAgeBand(value: string): value is AgeBand {
  return (AGE_BANDS as readonly string[]).includes(value);
}

export interface PlanStep {
  id: string;
  phase: PlanPhase;
  text: string;
}

export type PlanSource = "ai" | "demo_template";

export interface PlanDraft {
  title: string;
  whatIf: string;
  steps: PlanStep[];
  materials: string[];
  grownUpNotes: string;
  source: PlanSource;
}

const stepSchema = z.object({
  id: z.string().min(1).max(40),
  phase: z.enum(PLAN_PHASES),
  text: z.string().min(1).max(400),
});

/** Safely read steps stored as JSON in the database; drops anything malformed. */
export function parseSteps(value: unknown): PlanStep[] {
  if (!Array.isArray(value)) return [];
  const out: PlanStep[] = [];
  for (const item of value) {
    const parsed = stepSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Shape the AI must return. Kept small so it can be strictly validated. */
export const aiPlanSchema = z.object({
  title: z.string().min(1).max(120),
  what_if: z.string().min(1).max(300),
  steps: z
    .array(z.object({ phase: z.enum(PLAN_PHASES), text: z.string().min(1).max(300) }))
    .min(3)
    .max(8),
  materials: z.array(z.string().min(1).max(80)).max(12),
  grown_up_notes: z.string().max(600),
});

export type AiPlan = z.infer<typeof aiPlanSchema>;

/** Validate raw AI output and convert it to a draft; returns null when it doesn't fit. */
export function normalizeAiPlan(raw: unknown): PlanDraft | null {
  const parsed = aiPlanSchema.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;
  const phases = new Set(p.steps.map((s) => s.phase));
  if (!phases.has("wonder") || !phases.has("explore") || !phases.has("show")) return null;
  return {
    title: p.title.trim(),
    whatIf: p.what_if.trim(),
    steps: p.steps.map((s, i) => ({ id: `s${i + 1}`, phase: s.phase, text: s.text.trim() })),
    materials: p.materials.map((m) => m.trim()).filter(Boolean),
    grownUpNotes: p.grown_up_notes.trim(),
    source: "ai",
  };
}
import { generateResponse } from "@lovable.dev/ai-gateway";
import { normalizeAiPlan, type AgeBand, type PlanDraft } from "./plan-types";

const SYSTEM = `You help parents plan playful, open-ended creative explorations for their child.
Principles: curiosity over performance, no grades, no competition, no "right answer", safe at home, low cost.
Structure every plan around three phases: "wonder" (What if?), "explore" (Let's find out), "show" (Look what I did!).
Never ask for or invent personal details about the child. Never suggest posting online, social media, contests, auditions, casting or selling.
Never suggest downloading or re-uploading videos or content made by others.
Keep language warm, short, and readable by a parent. Steps: 4-6 total, at least one of each phase.`;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "what_if", "steps", "materials", "grown_up_notes"],
  properties: {
    title: { type: "string", description: "Short playful plan title, max 60 characters" },
    what_if: { type: "string", description: "The idea phrased as a 'What if...?' question" },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["phase", "text"],
        properties: {
          phase: { type: "string", enum: ["wonder", "explore", "show"] },
          text: { type: "string", description: "One short step, max 200 characters" },
        },
      },
    },
    materials: { type: "array", items: { type: "string" } },
    grown_up_notes: { type: "string", description: "Safety and facilitation notes for the parent, max 300 characters" },
  },
} as const;

function extractText(response: unknown): string {
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      const block = c as { type?: unknown; text?: unknown };
      if (block.type === "output_text" && typeof block.text === "string") parts.push(block.text);
    }
  }
  return parts.join("");
}

export interface AiPlanInput {
  prompt: string;
  ageBand: AgeBand;
  interests: string[];
  linkHost: string | null;
}

/** Calls the AI and returns a validated draft, or throws so the caller can fall back. */
export async function generateAiPlan(input: AiPlanInput): Promise<PlanDraft> {
  const lines = [
    `Child age band: ${input.ageBand}`,
    `Child interests: ${input.interests.slice(0, 10).join(", ") || "not specified"}`,
    `The idea: ${input.prompt.slice(0, 1000)}`,
  ];
  if (input.linkHost) {
    lines.push(`The parent saved a reference link from ${input.linkHost}. Do not assume its contents; use it only as loose context.`);
  }
  const response = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions: SYSTEM,
    input: [{ role: "user", content: lines.join("\n") }],
    text: { format: { type: "json_schema", name: "exploration_plan", strict: true, schema: JSON_SCHEMA } },
  });
  const text = extractText(response);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI returned unreadable plan");
  }
  const draft = normalizeAiPlan(parsed);
  if (!draft) throw new Error("AI plan did not match the safe plan format");
  return draft;
}
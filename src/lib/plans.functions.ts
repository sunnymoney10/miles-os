import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { buildTemplatePlan } from "./plan-templates";
import { isAgeBand, type PlanDraft } from "./plan-types";
import { hostForAi } from "./inspiration";
import { resolvePlanMode, toConsentMap } from "./consents";

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ inspirationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Every read below runs as the signed-in parent, so row-level rules block other families' data.
    const { data: insp, error: inspError } = await supabase
      .from("inspirations")
      .select("id, child_id, prompt, source_url")
      .eq("id", data.inspirationId)
      .maybeSingle();
    if (inspError) throw new Error("Could not load this idea.");
    if (!insp) throw new Error("Idea not found.");

    const { data: child } = await supabase
      .from("children")
      .select("id, age_band, interests")
      .eq("id", insp.child_id)
      .maybeSingle();
    if (!child || !isAgeBand(child.age_band)) throw new Error("Child profile not found.");

    const { data: consentRows } = await supabase
      .from("child_consents")
      .select("consent_type, granted")
      .eq("child_id", child.id);
    const consents = toConsentMap(consentRows ?? []);
    if (!consents.profile_storage) throw new Error("Profile storage consent is missing for this child.");

    const aiConfigured = Boolean(process.env["LOVABLE_API_KEY"]);
    const mode = resolvePlanMode(consents, aiConfigured);
    const templateInput = { prompt: insp.prompt, ageBand: child.age_band, interests: child.interests };

    let draft: PlanDraft;
    let notice: string;
    if (mode === "ai") {
      try {
        const { generateAiPlan } = await import("./plan-ai.server");
        draft = await generateAiPlan({ ...templateInput, linkHost: hostForAi(insp.source_url) });
        notice = "AI draft created. Please review and edit before approving.";
      } catch (err) {
        console.error("AI plan generation failed, using demo template", err);
        draft = buildTemplatePlan(templateInput);
        notice = "The AI service didn't respond, so a demo template was used instead.";
      }
    } else {
      draft = buildTemplatePlan(templateInput);
      notice = consents.ai_plan_generation
        ? "AI isn't configured, so a demo template was used."
        : "AI plan ideas are off for this child, so a demo template was used.";
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        child_id: child.id,
        parent_id: context.userId,
        inspiration_id: insp.id,
        title: draft.title,
        what_if: draft.whatIf,
        steps: draft.steps as unknown as Json,
        materials: draft.materials,
        grown_up_notes: draft.grownUpNotes,
        source: draft.source,
      })
      .select("id")
      .single();
    if (planError || !plan) {
      console.error(planError);
      throw new Error("Could not save the plan.");
    }

    return { planId: plan.id, source: draft.source, notice };
  });
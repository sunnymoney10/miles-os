export const CONSENT_TYPES = [
  "profile_storage",
  "ai_plan_generation",
  "media_storage",
  "family_circle_sharing",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CURRENT_POLICY_VERSION = "2026-11-mvp";

export const CONSENT_COPY: Record<ConsentType, { label: string; description: string; required: boolean }> = {
  profile_storage: {
    label: "Save this profile",
    description:
      "Store a nickname, age band and interests in your private family space. Required. To withdraw, delete the profile.",
    required: true,
  },
  ai_plan_generation: {
    label: "AI plan ideas",
    description:
      "Send the idea text, age band and interests (never the nickname) to an AI model to draft a plan. Off = demo templates only.",
    required: false,
  },
  media_storage: {
    label: "Private photos & recordings",
    description: "Save photos, audio or video your family made in private storage. Only you can see them unless you share.",
    required: false,
  },
  family_circle_sharing: {
    label: "Family circle sharing",
    description:
      "Allow you to share chosen journal entries with people you invited. Each entry still needs your approval.",
    required: false,
  },
};

export type ConsentMap = Record<ConsentType, boolean>;

export function toConsentMap(rows: Array<{ consent_type: string; granted: boolean }>): ConsentMap {
  const map: ConsentMap = {
    profile_storage: false,
    ai_plan_generation: false,
    media_storage: false,
    family_circle_sharing: false,
  };
  for (const row of rows) {
    if ((CONSENT_TYPES as readonly string[]).includes(row.consent_type)) {
      map[row.consent_type as ConsentType] = row.granted;
    }
  }
  return map;
}

export type PlanMode = "ai" | "demo_template";

/** AI is used only when the parent consented AND the AI service is configured. */
export function resolvePlanMode(consents: ConsentMap, aiConfigured: boolean): PlanMode {
  return consents.ai_plan_generation && aiConfigured ? "ai" : "demo_template";
}

export function canUploadMedia(consents: ConsentMap): boolean {
  return consents.profile_storage && consents.media_storage;
}

export type ShareCheck = { ok: true } | { ok: false; reason: string };

export function canShareEntry(consents: ConsentMap, parentConfirmed: boolean): ShareCheck {
  if (!consents.family_circle_sharing) {
    return { ok: false, reason: "Turn on family circle sharing for this child first." };
  }
  if (!parentConfirmed) {
    return { ok: false, reason: "Please confirm you approve sharing this entry." };
  }
  return { ok: true };
}

/** Validates a post-sign-in redirect so it can only point inside this app. */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
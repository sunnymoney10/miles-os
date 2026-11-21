import type { AgeBand, PlanDraft, PlanStep } from "./plan-types";

/**
 * Deterministic, demo-safe plan templates. Used whenever AI is unavailable or the
 * parent has not consented to AI plan ideas. Same input always gives the same plan.
 */

interface Theme {
  key: string;
  keywords: string[];
  wonder: string;
  explore: string[];
  show: string;
  materials: string[];
}

const THEMES: Theme[] = [
  {
    key: "build",
    keywords: ["build", "house", "tower", "bridge", "robot", "machine", "fort", "den", "castle", "car", "boat", "lego", "building"],
    wonder: "Imagine it first: how big is it, who uses it, and what makes it special?",
    explore: [
      "Gather whatever is around — boxes, tape, blocks — and build a first version.",
      "Test it. Does it stand up, roll, or hold something? Notice what wobbles.",
    ],
    show: "Give a tour of what you built and explain the cleverest part.",
    materials: ["Cardboard or blocks", "Tape", "Scissors (grown-up help)", "Markers"],
  },
  {
    key: "art",
    keywords: ["draw", "paint", "color", "colour", "picture", "comic", "sculpture", "clay", "art", "drawing", "painting"],
    wonder: "Close your eyes and picture it. What colors and shapes do you see?",
    explore: [
      "Make a quick, messy sketch — no erasing, just trying.",
      "Try a second version with a different material or color.",
    ],
    show: "Hang both versions up and tell the story behind them.",
    materials: ["Paper", "Crayons, pencils or paint", "Clay or playdough (optional)"],
  },
  {
    key: "music",
    keywords: ["song", "music", "sound", "drum", "dance", "sing", "noise", "rhythm", "instrument"],
    wonder: "What would it sound like? Loud, soft, fast, slow?",
    explore: [
      "Find three things at home that make interesting sounds.",
      "Make up a pattern — repeat it, then change one part.",
    ],
    show: "Perform it for the family (or record it privately) and name your song.",
    materials: ["Pots, spoons, boxes or rice shakers", "A space to move"],
  },
  {
    key: "nature",
    keywords: ["plant", "bug", "tree", "garden", "bird", "animal", "dinosaur", "flower", "leaf", "ocean", "fish", "insect", "dinosaurs", "animals"],
    wonder: "What do you already know about it, and what do you wish you knew?",
    explore: [
      "Look closely — outside, in a book, or at a picture — and draw what you notice.",
      "Pick one question and try to find the answer together.",
    ],
    show: "Make a mini field-guide page about what you discovered.",
    materials: ["Paper and pencil", "Magnifying glass (optional)", "Library book or grown-up search"],
  },
  {
    key: "science",
    keywords: ["why", "float", "sink", "melt", "magnet", "light", "shadow", "rocket", "volcano", "experiment", "space", "planet", "science"],
    wonder: "Make a guess: what do you think will happen, and why?",
    explore: [
      "Set up a small, safe test with a grown-up nearby.",
      "Try it again and change just one thing. Did the result change?",
    ],
    show: "Show your test and share whether your guess was right — both answers are great.",
    materials: ["Bowl of water or simple household items", "Towel", "Notebook for guesses"],
  },
  {
    key: "story",
    keywords: ["story", "pretend", "character", "dragon", "movie", "play", "puppet", "superhero", "princess", "monster", "adventure"],
    wonder: "Who is the hero, and what problem do they have?",
    explore: [
      "Act out the beginning with toys, puppets, or yourselves.",
      "Try two different endings — which one feels best?",
    ],
    show: "Perform or tell the story, and make a cover picture for it.",
    materials: ["Toys or socks for puppets", "Paper for a cover", "Dress-up items (optional)"],
  },
];

const FALLBACK: Theme = {
  key: "tinker",
  keywords: [],
  wonder: "Say the idea out loud. What's the most exciting part?",
  explore: [
    "Try the smallest version of the idea with things you already have.",
    "Notice what happened and pick one thing to try differently.",
  ],
  show: "Share what you made or found out — including the surprises.",
  materials: ["Things you already have at home"],
};

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

export function pickTheme(prompt: string, interests: string[]): Theme {
  const promptWords = new Set(tokenize(prompt));
  const interestWords = new Set(interests.flatMap(tokenize));
  let best: Theme = FALLBACK;
  let bestScore = 0;
  for (const theme of THEMES) {
    let score = 0;
    for (const k of theme.keywords) {
      if (promptWords.has(k)) score += 2;
      if (interestWords.has(k)) score += 1;
    }
    if (score > bestScore) {
      best = theme;
      bestScore = score;
    }
  }
  return best;
}

export function toWhatIf(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (/^what if\b/i.test(clean)) {
    const body = clean.replace(/^what if\b/i, "What if");
    return /[?.!]$/.test(body) ? body : `${body}?`;
  }
  return `What if we tried this: ${clean.replace(/[?.!]+$/, "")}?`;
}

export function toTitle(prompt: string): string {
  const clean = prompt
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^what if\s*/i, "")
    .replace(/[?.!]+$/, "");
  const base = clean.length > 0 ? clean : "A new idea";
  const cased = base.charAt(0).toUpperCase() + base.slice(1);
  return cased.length > 60 ? `${cased.slice(0, 57).trimEnd()}…` : cased;
}

export interface TemplateInput {
  prompt: string;
  ageBand: AgeBand;
  interests: string[];
}

export function buildTemplatePlan(input: TemplateInput): PlanDraft {
  const theme = pickTheme(input.prompt, input.interests);
  const texts: Array<[PlanStep["phase"], string]> = [
    ["wonder", theme.wonder],
    ...theme.explore.map((t): [PlanStep["phase"], string] => ["explore", t]),
  ];
  if (input.ageBand === "9-12" || input.ageBand === "13-15") {
    texts.push(["explore", "Change one thing on purpose and compare. Write down what you noticed."]);
  }
  texts.push(["show", theme.show]);

  const notes = [
    "Demo template — written by Miles OS rules, not AI.",
    "Follow the child's lead. There is no right answer and nothing to grade.",
  ];
  if (input.ageBand === "3-5") notes.push("Grown-up handles cutting, heat and small parts.");

  return {
    title: toTitle(input.prompt),
    whatIf: toWhatIf(input.prompt),
    steps: texts.map(([phase, text], i) => ({ id: `s${i + 1}`, phase, text })),
    materials: [...theme.materials],
    grownUpNotes: notes.join(" "),
    source: "demo_template",
  };
}
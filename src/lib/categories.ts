import type { CategoryId, ReportStatus, Severity } from "./types";

export interface CategoryInfo {
  id: CategoryId;
  en: string;
  ta: string;
  /** Short glyph used inside map markers (never the only signal — text labels accompany it). */
  glyph: string;
  /**
   * How quickly a report of this kind is assumed to go out of date, in days.
   * Infinity = structural (stairs don't disappear on their own).
   * After one half-life a report is shown as "may be outdated – please re-verify".
   */
  halfLifeDays: number;
  /** Keywords (English + Tamil) used to pre-fill the category from a voice/typed description. */
  keywords: string[];
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  broken_footpath: {
    id: "broken_footpath",
    en: "Broken or uneven footpath",
    ta: "உடைந்த / சீரற்ற நடைபாதை",
    glyph: "≋",
    halfLifeDays: 90,
    keywords: ["broken", "uneven", "pothole", "crack", "footpath", "pavement", "உடைந்த", "குழி", "நடைபாதை", "சீரற்ற"],
  },
  blocked_ramp: {
    id: "blocked_ramp",
    en: "Blocked or unusable ramp",
    ta: "தடைபட்ட / பயன்படுத்த முடியாத சாய்வுதளம்",
    glyph: "◿",
    halfLifeDays: 10,
    keywords: ["ramp", "blocked ramp", "parked", "bike on ramp", "சாய்வு", "சாய்வுதளம்", "வாகனம்"],
  },
  stairs: {
    id: "stairs",
    en: "Stairs / no step-free access",
    ta: "படிக்கட்டுகள் / படியில்லா வழி இல்லை",
    glyph: "▟",
    halfLifeDays: Number.POSITIVE_INFINITY,
    keywords: ["stairs", "steps", "step", "staircase", "footbridge", "subway", "படி", "படிக்கட்டு", "நடைமேம்பாலம்"],
  },
  construction_debris: {
    id: "construction_debris",
    en: "Construction debris / obstruction",
    ta: "கட்டுமான குப்பை / தடை",
    glyph: "▲",
    halfLifeDays: 14,
    keywords: ["construction", "debris", "sand", "bricks", "obstruction", "dug", "digging", "கட்டுமான", "மணல்", "செங்கல்", "குப்பை", "தடை", "தோண்டி"],
  },
  waterlogging: {
    id: "waterlogging",
    en: "Waterlogging / flooding",
    ta: "நீர் தேக்கம் / வெள்ளம்",
    glyph: "≈",
    halfLifeDays: 2,
    keywords: ["water", "flood", "flooding", "waterlogged", "puddle", "rain", "drain", "தண்ணீர்", "நீர்", "வெள்ளம்", "மழை", "தேக்கம்", "சாக்கடை"],
  },
  other: {
    id: "other",
    en: "Other accessibility barrier",
    ta: "பிற அணுகல் தடை",
    glyph: "•",
    halfLifeDays: 21,
    keywords: [],
  },
};

export const SEVERITY_LABELS: Record<Severity, { en: string; ta: string; hint: string; hintTa: string }> = {
  low: { en: "Low", ta: "குறைவு", hint: "Inconvenient but passable for most", hintTa: "சிரமம், ஆனால் பெரும்பாலோர் கடக்கலாம்" },
  medium: { en: "Medium", ta: "நடுத்தரம்", hint: "Difficult for wheelchairs or walking aids", hintTa: "சக்கர நாற்காலி / நடை உதவிக்கு கடினம்" },
  high: { en: "High", ta: "அதிகம்", hint: "Likely unsafe for many mobility needs", hintTa: "பலருக்கு பாதுகாப்பற்றதாக இருக்கலாம்" },
  impassable: { en: "Impassable", ta: "கடக்க முடியாது", hint: "Path is fully blocked", hintTa: "வழி முழுமையாக அடைபட்டுள்ளது" },
};

export const STATUS_LABELS: Record<ReportStatus, { en: string; ta: string; glyph: string; explain: string; explainTa: string }> = {
  pending: {
    en: "Pending",
    ta: "சரிபார்ப்பில்",
    glyph: "?",
    explain: "Reported once; not yet confirmed by others. Treated as uncertain.",
    explainTa: "ஒருமுறை பதிவானது; இன்னும் உறுதிசெய்யப்படவில்லை.",
  },
  confirmed: {
    en: "Confirmed",
    ta: "உறுதிசெய்யப்பட்டது",
    glyph: "!",
    explain: "Confirmed by 2+ independent people or a moderator.",
    explainTa: "2+ நபர்கள் அல்லது நிர்வாகி உறுதிசெய்தார்.",
  },
  disputed: {
    en: "Disputed",
    ta: "சர்ச்சையில்",
    glyph: "~",
    explain: "People disagree about this report. Treated with caution.",
    explainTa: "இந்த பதிவில் மாறுபட்ட கருத்துகள் உள்ளன.",
  },
  resolved: {
    en: "Resolved",
    ta: "சரிசெய்யப்பட்டது",
    glyph: "✓",
    explain: "Reported fixed by 2+ people or a moderator. Ignored by routing.",
    explainTa: "சரிசெய்யப்பட்டதாக 2+ நபர்கள் / நிர்வாகி தெரிவித்தனர்.",
  },
};

/** Guess a category from free text (voice or typed). Returns null if nothing matches. */
export function guessCategoryFromText(text: string): CategoryId | null {
  const t = text.toLowerCase();
  let best: { id: CategoryId; hits: number } | null = null;
  for (const c of Object.values(CATEGORIES)) {
    const hits = c.keywords.filter((k) => t.includes(k.toLowerCase())).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { id: c.id, hits };
  }
  return best?.id ?? null;
}

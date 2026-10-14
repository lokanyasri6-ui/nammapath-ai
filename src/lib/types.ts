import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Barrier categories, severities, statuses                            */
/* ------------------------------------------------------------------ */

export const CATEGORY_IDS = [
  "broken_footpath",
  "blocked_ramp",
  "stairs",
  "construction_debris",
  "waterlogging",
  "other",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];
export const CategorySchema = z.enum(CATEGORY_IDS);

export const SEVERITIES = ["low", "medium", "high", "impassable"] as const;
export type Severity = (typeof SEVERITIES)[number];
export const SeveritySchema = z.enum(SEVERITIES);

export const STATUSES = ["pending", "confirmed", "disputed", "resolved"] as const;
export type ReportStatus = (typeof STATUSES)[number];
export const StatusSchema = z.enum(STATUSES);

/** Where a piece of data came from. Shown in the UI so synthetic data is never mistaken for verified data. */
export const DATA_ORIGINS = ["synthetic_demo", "community", "verified_survey"] as const;
export type DataOrigin = (typeof DATA_ORIGINS)[number];

/* ------------------------------------------------------------------ */
/* Pedestrian graph                                                    */
/* ------------------------------------------------------------------ */

export type Tri = "yes" | "no" | "unknown";

export interface GraphNode {
  id: string;
  name: string;
  nameTa: string;
  lat: number;
  lng: number;
  kind: "junction" | "entrance" | "landmark" | "transit";
  /** Selectable as a start/destination in the UI */
  selectable: boolean;
}

export interface Segment {
  id: string;
  from: string;
  to: string;
  /** Optional intermediate geometry, [lat, lng][] (excluding endpoints). */
  via?: [number, number][];
  name: string;
  /** Steps on the segment: none, a few steps (kerb/short flight), stairs only (footbridge/subway), or unknown. */
  steps: "none" | "some" | "stairs_only" | "unknown";
  ramp: "present" | "absent" | "not_needed" | "unknown";
  surface: "good" | "fair" | "poor" | "unknown";
  widthM: number | null;
  slopePct: number | null;
  /** Signalised / marked crossing with audible signal where the segment crosses a road */
  safeCrossing: Tri | "not_applicable";
  tactilePaving: Tri;
  handrail: Tri | "not_applicable";
  verification: "verified" | "community" | "unverified";
  origin: DataOrigin;
  updatedAt: string; // ISO
}

export interface Graph {
  areaName: string;
  areaNameTa: string;
  center: [number, number];
  nodes: GraphNode[];
  segments: Segment[];
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export const AiPredictionSchema = z.object({
  category: z.enum([...CATEGORY_IDS, "no_barrier_visible"]),
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(1).max(600),
  uncertainty: z.string().max(600).default(""),
  needsHumanReview: z.boolean(),
});
export type AiPrediction = z.infer<typeof AiPredictionSchema>;

export interface AiResult {
  prediction: AiPrediction;
  provider: "gemini" | "demo";
  model: string;
  /** True when the prediction is NOT real model inference. */
  isDemo: boolean;
  /** Set when we downgraded the model's answer (e.g. low confidence) */
  policyNotes: string[];
}

export interface Vote {
  clientId: string;
  action: "confirm" | "dispute" | "resolve";
  at: string;
}

export interface StatusEvent {
  at: string;
  from: ReportStatus | null;
  to: ReportStatus;
  by: "system" | "community" | "moderator";
  note: string;
}

export interface BarrierReport {
  id: string;
  lat: number;
  lng: number;
  segmentId: string | null;
  category: CategoryId;
  severity: Severity;
  description: string;
  status: ReportStatus;
  origin: DataOrigin;
  ai: {
    category: AiPrediction["category"];
    severity: Severity;
    confidence: number;
    explanation: string;
    uncertainty: string;
    provider: "gemini" | "demo";
    isDemo: boolean;
  } | null;
  /** True if the reporter changed the AI category/severity */
  userCorrectedAi: boolean;
  hasPhoto: boolean;
  reporterId: string;
  votes: Vote[];
  history: StatusEvent[];
  createdAt: string;
  updatedAt: string;
  /** Last time someone on the ground confirmed it still exists (or the creation time). */
  lastVerifiedAt: string;
  language: "en" | "ta";
}

/* ------------------------------------------------------------------ */
/* API input schemas                                                   */
/* ------------------------------------------------------------------ */

export const ClientIdSchema = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/, "Invalid client id");

export const CreateReportSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: CategorySchema,
  severity: SeveritySchema,
  description: z.string().trim().max(500).default(""),
  clientId: ClientIdSchema,
  language: z.enum(["en", "ta"]).default("en"),
  ai: z
    .object({
      category: AiPredictionSchema.shape.category,
      severity: SeveritySchema,
      confidence: z.number().min(0).max(1),
      explanation: z.string().max(600),
      uncertainty: z.string().max(600).default(""),
      provider: z.enum(["gemini", "demo"]),
      isDemo: z.boolean(),
    })
    .nullable()
    .default(null),
  /** Base64 data URL of the (client-side re-encoded, EXIF-stripped) photo. Optional. */
  photo: z.string().max(7_500_000).nullable().default(null),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export const ReportActionSchema = z.object({
  action: z.enum(["confirm", "dispute", "resolve"]),
  clientId: ClientIdSchema,
});

export const ClassificationUpdateSchema = z.object({
  category: CategorySchema,
  severity: SeveritySchema,
  clientId: ClientIdSchema,
});

export const ModerateSchema = z.object({
  status: StatusSchema,
  note: z.string().trim().max(300).default(""),
});

export const PROFILE_IDS = ["wheelchair", "walking_aid", "general", "low_vision"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

export const RouteRequestSchema = z.object({
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  profile: z.enum(PROFILE_IDS),
});

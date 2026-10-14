import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/* ---------------- rate limiting (per instance, sliding window) ---------------- */

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit = Number(process.env.RATE_LIMIT_PER_MINUTE || 12), windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return true;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/* ---------------- moderator auth ---------------- */

export const DEMO_MODERATOR_PIN = "demo-moderator";

export function moderatorTokenConfigured(): string | null {
  const t = process.env.MODERATOR_TOKEN?.trim();
  if (t) return t;
  // Only allow the public demo PIN when running fully in demo mode (no database).
  const dbConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return dbConfigured ? null : DEMO_MODERATOR_PIN;
}

export function isModerator(req: Request): boolean {
  const expected = moderatorTokenConfigured();
  if (!expected) return false;
  const got = req.headers.get("x-moderator-token") ?? "";
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/* ---------------- responses ---------------- */

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function zodMessage(err: ZodError) {
  return err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
}

/** Read JSON with a hard size limit. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) throw new PayloadTooLarge();
  const text = await req.text();
  if (text.length > maxBytes) throw new PayloadTooLarge();
  try {
    return JSON.parse(text);
  } catch {
    throw new BadJson();
  }
}
export class PayloadTooLarge extends Error {}
export class BadJson extends Error {}

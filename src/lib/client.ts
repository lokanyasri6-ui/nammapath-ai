"use client";

import type { ProfileId } from "./types";

/* ---------------- safe localStorage ---------------- */
function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode etc. — fine */
  }
}

let memClientId: string | null = null;
/** Anonymous random device id used only to prevent duplicate votes. No personal data. */
export function getClientId(): string {
  const existing = lsGet("np.clientId") ?? memClientId;
  if (existing) return existing;
  const id = crypto.randomUUID();
  memClientId = id;
  lsSet("np.clientId", id);
  return id;
}

export function getSavedProfile(): ProfileId | null {
  const v = lsGet("np.profile");
  return v === "wheelchair" || v === "walking_aid" || v === "general" || v === "low_vision" ? v : null;
}
export function saveProfile(p: ProfileId) {
  lsSet("np.profile", p);
}
export function getSavedLang(): "en" | "ta" | null {
  const v = lsGet("np.lang");
  return v === "en" || v === "ta" ? v : null;
}
export function saveLang(l: "en" | "ta") {
  lsSet("np.lang", l);
}

/* ---------------- fetch helper ---------------- */
export class ApiError extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown> = {}) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(rest.headers ?? {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError("Network error — check your connection and try again.", 0);
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(String(body.error ?? `Request failed (${res.status})`), res.status, body);
  return body as T;
}

/* ---------------- image re-encoding (strips EXIF incl. GPS) ---------------- */
export const MAX_CLIENT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function checkImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only JPEG, PNG or WebP photos are accepted.";
  if (file.size > 15 * 1024 * 1024) return "That photo is too large (over 15 MB). Please choose a smaller one.";
  return null;
}

/**
 * Draw the image onto a canvas and export a new JPEG (max 1280 px).
 * Canvas export does not carry EXIF metadata, so camera GPS and device data are dropped,
 * and the original full-resolution file is never uploaded.
 */
export async function reencodeImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("This photo could not be opened. Please try a different one.");
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))), "image/jpeg", 0.82),
  );
  if (blob.size > MAX_CLIENT_BYTES) throw new Error("The processed photo is still larger than 5 MB.");
  const dataUrl: string = await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(blob);
  });
  return { blob, dataUrl };
}

export function timeAgo(iso: string, lang: "en" | "ta"): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const fmt = new Intl.RelativeTimeFormat(lang === "ta" ? "ta-IN" : "en-IN", { numeric: "auto" });
  if (s < 3600) return fmt.format(-Math.max(1, Math.round(s / 60)), "minute");
  if (s < 86400) return fmt.format(-Math.round(s / 3600), "hour");
  return fmt.format(-Math.round(s / 86400), "day");
}

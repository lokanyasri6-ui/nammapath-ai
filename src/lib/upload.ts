/** Upload validation shared by the classify and report endpoints. */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB after client-side re-encoding
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export class UploadError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
  }
}

/** Detect the real image type from magic bytes — never trust the file name or the declared type alone. */
export function sniffImageType(bytes: Uint8Array): AllowedMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

export interface ValidatedImage {
  bytes: Uint8Array;
  mime: AllowedMime;
}

/** Validate raw bytes + declared type. Throws UploadError with a user-safe message. */
export function validateImageBytes(bytes: Uint8Array, declaredType?: string | null): ValidatedImage {
  if (!bytes.length) throw new UploadError("The file is empty.");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new UploadError("The photo is larger than 5 MB. Please choose a smaller photo.", 413);
  const mime = sniffImageType(bytes);
  if (!mime) throw new UploadError("Only JPEG, PNG or WebP photos are accepted.", 415);
  if (declaredType && declaredType !== "application/octet-stream" && !ALLOWED_MIME.includes(declaredType as AllowedMime)) {
    throw new UploadError("Only JPEG, PNG or WebP photos are accepted.", 415);
  }
  return { bytes, mime };
}

/** Parse and validate a `data:image/...;base64,...` URL. */
export function validateDataUrl(dataUrl: string): ValidatedImage {
  const m = /^data:([a-z/+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new UploadError("The photo could not be read.");
  const bytes = Uint8Array.from(Buffer.from(m[2], "base64"));
  return validateImageBytes(bytes, m[1]);
}

export function toDataUrl(img: ValidatedImage) {
  return `data:${img.mime};base64,${Buffer.from(img.bytes).toString("base64")}`;
}

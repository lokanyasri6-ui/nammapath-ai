import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, sniffImageType, UploadError, validateDataUrl, validateImageBytes } from "@/lib/upload";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

describe("upload validation", () => {
  it("detects real image types from magic bytes", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("rejects non-images even if they claim to be JPEG", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(() => validateImageBytes(html, "image/jpeg")).toThrow(UploadError);
    try {
      validateImageBytes(html, "image/jpeg");
    } catch (e) {
      expect((e as UploadError).status).toBe(415);
    }
  });

  it("rejects SVG, GIF and PDF", () => {
    expect(() => validateImageBytes(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"), "image/svg+xml")).toThrow(UploadError);
    expect(() => validateImageBytes(new TextEncoder().encode("GIF89a...."), "image/gif")).toThrow(UploadError);
    expect(() => validateImageBytes(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).toThrow(UploadError);
  });

  it("rejects empty and oversized files", () => {
    expect(() => validateImageBytes(new Uint8Array(), "image/jpeg")).toThrow(/empty/);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(JPEG);
    try {
      validateImageBytes(big, "image/jpeg");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as UploadError).status).toBe(413);
    }
  });

  it("rejects a mismatched declared type", () => {
    expect(() => validateImageBytes(JPEG, "text/html")).toThrow(UploadError);
  });

  it("parses data URLs and rejects malformed ones", () => {
    const url = `data:image/jpeg;base64,${Buffer.from(JPEG).toString("base64")}`;
    expect(validateDataUrl(url).mime).toBe("image/jpeg");
    expect(() => validateDataUrl("javascript:alert(1)")).toThrow(UploadError);
  });
});

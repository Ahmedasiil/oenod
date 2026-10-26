import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertPublicUrl } from "./integrations/safeurl";
import { APP_URL } from "./env";

// OENOD's own logo, used as the primary mark on every certificate and branded document.
const files = { white: "oenod-mark-white.png", navy: "oenod-mark-navy.png", full: "oenod-logo.jpg" } as const;
export const OENOD_MARK_RATIO = 594 / 174;
const cache = new Map<string, string>();

export async function oenodLogo(kind: keyof typeof files = "navy") {
  if (cache.has(kind)) return cache.get(kind)!;
  const buf = await readFile(path.join(process.cwd(), "public", "brand", files[kind]));
  const uri = `data:image/${files[kind].endsWith(".png") ? "png" : "jpeg"};base64,${buf.toString("base64")}`;
  cache.set(kind, uri);
  return uri;
}

export const oenodLogoUrl = (kind: keyof typeof files = "white") => `${APP_URL}/brand/${files[kind]}`;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const logoCache = new Map<string, { at: number; uri: string | null }>();

/**
 * A company's logo as a data URI so it can be embedded in a certificate or PDF.
 * Only public https images up to 1 MB are fetched; anything else falls back to a monogram.
 */
export async function companyLogo(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:image/")) return url.length < 1.5e6 && !url.startsWith("data:image/svg") ? url : null;
  const hit = logoCache.get(url);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.uri;
  let uri: string | null = null;
  try {
    const target = url.startsWith("/") ? new URL(url, APP_URL).toString() : url;
    if (target.startsWith(APP_URL) && url.startsWith("/brand/")) {
      const buf = await readFile(path.join(process.cwd(), "public", url));
      uri = `data:image/${url.endsWith(".png") ? "png" : "jpeg"};base64,${buf.toString("base64")}`;
    } else {
      await assertPublicUrl(target);
      const r = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(8000) });
      const type = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      // SVG logos can carry scripts, so they are not embedded.
      if (r.ok && IMAGE_TYPES.includes(type) && type !== "image/svg+xml") {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.byteLength <= 1024 * 1024) uri = `data:${type};base64,${buf.toString("base64")}`;
      }
    }
  } catch { uri = null; }
  logoCache.set(url, { at: Date.now(), uri });
  return uri;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "•";
}

export const safeColor = (c: string | null | undefined, fallback = "#000F55") => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback);

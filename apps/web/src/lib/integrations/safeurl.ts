import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { HttpError } from "../http";

// Block requests to private networks so a connector can't be pointed at the server itself (SSRF).
function privateIp(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

export async function assertPublicUrl(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { throw new HttpError(422, "Enter a full URL, like https://api.example.com"); }
  if (u.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && u.protocol === "http:")) throw new HttpError(422, "Connectors must use https://");
  if (u.username || u.password) throw new HttpError(422, "Put credentials in the authentication settings, not the URL.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new HttpError(422, "Private addresses can't be used.");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => { throw new HttpError(422, `Couldn't find ${host}.`); })).map((r) => r.address);
  if (ips.some(privateIp)) throw new HttpError(422, "Private network addresses can't be used.");
  return u;
}

/** fetch() with SSRF checks, no redirects to private hosts, a timeout and a size cap. */
export async function safeFetch(url: string, init: RequestInit = {}, timeoutMs = 20_000) {
  let target = await assertPublicUrl(url);
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch(target, { ...init, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      target = await assertPublicUrl(new URL(r.headers.get("location")!, target).toString());
      continue;
    }
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024) throw new HttpError(502, "The app returned more than 5 MB.");
    const text = new TextDecoder().decode(buf);
    let data: unknown = text;
    try { data = text ? JSON.parse(text) : null; } catch {}
    return { status: r.status, ok: r.ok, headers: Object.fromEntries(r.headers.entries()), data };
  }
  throw new HttpError(502, "Too many redirects.");
}

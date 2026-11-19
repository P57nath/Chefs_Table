/**
 * Content-Security-Policy (docs/02 §9). Scripts are locked to a per-request
 * nonce (+ 'strict-dynamic' so Next's own chunks and the lazy 3D chunk load).
 * Styles allow 'unsafe-inline': React/Radix/Motion set style attributes and
 * sonner injects a <style>; style injection can't run code, scripts can't.
 */
export interface CspOptions {
  nonce: string;
  dev: boolean;
  supabaseUrl: string;
  /** Add upgrade-insecure-requests only when the app itself is served over https. */
  https: boolean;
}

const TURNSTILE = "https://challenges.cloudflare.com";
const SSLCOMMERZ = "https://*.sslcommerz.com";

export function buildCsp({ nonce, dev, supabaseUrl, https }: CspOptions): string {
  const supa = new URL(supabaseUrl);
  const supaHttp = supa.origin;
  const supaWs = `${supa.protocol === "https:" ? "wss:" : "ws:"}//${supa.host}`;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      TURNSTILE,
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supaHttp],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supaHttp, supaWs, TURNSTILE, ...(dev ? ["ws:", "wss:"] : [])],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", SSLCOMMERZ],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (https && !dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** 128-bit random nonce, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

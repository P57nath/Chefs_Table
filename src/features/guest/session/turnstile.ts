"use client";

/**
 * Invisible Cloudflare Turnstile, used only when NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is set. The token is passed to Supabase anonymous sign-in (captcha enabled in
 * Supabase Auth). Docs: developers.cloudflare.com/turnstile
 */
interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      size?: "invisible" | "flexible" | "compact" | "normal";
      appearance?: "always" | "execute" | "interaction-only";
      callback: (token: string) => void;
      "error-callback": () => void;
      "timeout-callback"?: () => void;
    },
  ) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("TURNSTILE_UNAVAILABLE"));
    script.onerror = () => {
      loading = null;
      reject(new TypeError("Failed to fetch Turnstile"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function getTurnstileToken(siteKey: string, timeoutMs = 15_000): Promise<string> {
  const api = await loadScript();
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.bottom = "0";
  host.style.right = "0";
  document.body.appendChild(host);
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("TURNSTILE_TIMEOUT")), timeoutMs);
      api.render(host, {
        sitekey: siteKey,
        appearance: "interaction-only",
        callback: (token) => {
          clearTimeout(timer);
          resolve(token);
        },
        "error-callback": () => {
          clearTimeout(timer);
          reject(new Error("TURNSTILE_FAILED"));
        },
      });
    });
  } finally {
    host.remove();
  }
}

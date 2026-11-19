"use client";

import { useServerInsertedHTML } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useNonce } from "./nonce";

/**
 * Minimal class-based theme provider (replaces next-themes). The no-flash script
 * is injected only during server rendering via useServerInsertedHTML, so React
 * never renders a <script> on client navigations (React 19 warns about that).
 */
export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeValue {
  theme: ThemeChoice;
  resolvedTheme: ResolvedTheme;
  forcedTheme?: ResolvedTheme;
  setTheme: (theme: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function useTheme(): ThemeValue {
  return use(ThemeContext) ?? { theme: "system", resolvedTheme: "light", setTheme: () => {} };
}

const storageListeners = new Set<() => void>();
function subscribeStorage(l: () => void) {
  storageListeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    storageListeners.delete(l);
    window.removeEventListener("storage", l);
  };
}
function subscribeSystem(l: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", l);
  return () => mql.removeEventListener("change", l);
}

function isChoice(v: unknown): v is ThemeChoice {
  return v === "light" || v === "dark" || v === "system";
}

/** Same logic as the provider, as a string for the pre-paint inline script. */
export function themeScript(storageKey: string, defaultTheme: ThemeChoice, forced?: ResolvedTheme) {
  const args = JSON.stringify([storageKey, defaultTheme, forced ?? null]).replace(/</g, "\\u003c");
  return `(function(a){try{var t=a[2]||localStorage.getItem(a[0])||a[1];if(t!=="light"&&t!=="dark"&&t!=="system")t=a[1];if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(t);d.style.colorScheme=t}catch(e){}})(${args})`;
}

export function ThemeProvider({
  storageKey,
  defaultTheme,
  forcedTheme,
  children,
}: {
  storageKey: string;
  defaultTheme: ThemeChoice;
  forcedTheme?: ResolvedTheme;
  children: ReactNode;
}) {
  const inserted = useRef(false);
  const nonce = useNonce();
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: themeScript(storageKey, defaultTheme, forcedTheme) }}
      />
    );
  });

  const stored = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => defaultTheme === "dark",
  );

  const theme: ThemeChoice = isChoice(stored) ? stored : defaultTheme;
  const resolvedTheme: ResolvedTheme =
    forcedTheme ?? (theme === "system" ? (systemDark ? "dark" : "light") : theme);

  // Keep <html> in sync (also covers client navigation between surfaces).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (next: ThemeChoice) => {
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // private mode: theme lasts for this page only
      }
      storageListeners.forEach((l) => l());
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, forcedTheme, setTheme }),
    [theme, resolvedTheme, forcedTheme, setTheme],
  );
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

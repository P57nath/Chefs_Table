"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useActionError } from "./use-action-error";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Runs a server action: pending state, error toast, success toast (optional)
 * and a router refresh so Server Components re-read the database.
 */
export function useRun() {
  const router = useRouter();
  const errorText = useActionError();
  const [pending, start] = useTransition();
  const [key, setKey] = useState<string | null>(null);

  function run<R extends Result>(
    action: () => Promise<R>,
    opts: { success?: string; key?: string; onDone?: (r: Extract<R, { ok: true }>) => void } = {},
  ) {
    setKey(opts.key ?? null);
    start(async () => {
      try {
        const res = await action();
        if (res.ok) {
          if (opts.success) toast.success(opts.success);
          opts.onDone?.(res as Extract<R, { ok: true }>);
          router.refresh();
        } else {
          toast.error(errorText(res.error));
        }
      } catch {
        toast.error(errorText("UNKNOWN"));
      }
    });
  }

  return { run, pending, pendingKey: pending ? key : null };
}

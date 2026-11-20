"use client";

import { CloudOff, RotateCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  body?: string;
  /** Network errors get the offline illustration and copy. */
  variant?: "error" | "offline";
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Error with a retry button. Never a blank screen. */
export function ErrorState({
  title,
  body,
  variant = "error",
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  const t = useTranslations();
  const Icon = variant === "offline" ? CloudOff : TriangleAlert;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="grid size-16 place-items-center rounded-full bg-ember/12 text-ember"
      >
        <Icon className="size-7" />
      </div>
      <div className="max-w-xs space-y-1.5">
        <h2 className="font-display text-xl font-medium">{title ?? t("states.errorTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {body ?? (variant === "offline" ? t("states.networkError") : t("states.errorBody"))}
        </p>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} loading={retrying}>
          <RotateCw aria-hidden />
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}

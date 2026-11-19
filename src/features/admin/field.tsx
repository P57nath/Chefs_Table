import type { ReactNode } from "react";

/** Label + control + error/hint, used by every admin form. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className ? `block space-y-1.5 ${className}` : "block space-y-1.5"}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm text-ember">{error}</span>
      ) : hint ? (
        <span className="block text-sm text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

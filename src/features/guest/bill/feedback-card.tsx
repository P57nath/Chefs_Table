"use client";

import { Heart, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localizeDigits } from "@/lib/digits";
import { asAppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

import { useMyFeedback, useSubmitFeedback } from "./use-bill-data";

/** 1–5 stars + optional comment (spec §4.6). Editable until the guest leaves. */
export function FeedbackCard({ className }: { className?: string }) {
  const t = useTranslations("feedback");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const existing = useMyFeedback();
  const submit = useSubmitFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);

  if (existing.isPending) return null;
  const sent = existing.data && !editing;
  if (sent) {
    return (
      <section
        className={cn(
          "flex items-center gap-3 rounded-3xl border border-border bg-card p-5",
          className,
        )}
        role="status"
      >
        <Heart className="size-6 shrink-0 text-ember" aria-hidden />
        <p className="flex-1">{t("thanks")}</p>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          {t("edit")}
        </Button>
      </section>
    );
  }

  const current = rating ?? existing.data?.rating ?? 0;
  const error = submit.error ? asAppError(submit.error) : null;

  async function send() {
    if (!current) return;
    await submit.mutateAsync({
      rating: current,
      comment: comment || (existing.data?.comment ?? ""),
    });
    setEditing(false);
  }

  return (
    <section
      aria-labelledby="feedback-title"
      className={cn("space-y-4 rounded-3xl border border-border bg-card p-5", className)}
    >
      <h2 id="feedback-title" className="font-display text-xl font-semibold">
        {t("title")}
      </h2>
      <fieldset>
        <legend className="sr-only">{t("ratingLabel")}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={current === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span className="grid size-12 place-items-center rounded-xl peer-focus-visible:ring-3 peer-focus-visible:ring-ring">
                <Star
                  aria-hidden
                  className={cn(
                    "size-8 transition",
                    n <= current ? "fill-primary text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="sr-only">{t("stars", { n: localizeDigits(n, locale) })}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("commentLabel")}</span>
        <Textarea
          value={comment || (editing ? (existing.data?.comment ?? "") : "")}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={t("commentPlaceholder")}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-ember">
          {tErr(error.key, error.params)}
        </p>
      ) : null}
      <Button
        className="w-full"
        size="lg"
        disabled={!current}
        loading={submit.isPending}
        onClick={send}
      >
        {t("send")}
      </Button>
    </section>
  );
}

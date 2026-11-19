"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { IconButton } from "@/components/common/icon-button";
import { LanguageToggle } from "@/components/common/language-toggle";

import { useGuestSession } from "./guest-session";

/** Sticky guest header: back link, title, table chip, language. */
export function GuestPageHeader({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  const { table } = useGuestSession();
  return (
    <header className="glass sticky top-0 z-30 border-b border-border">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
        <IconButton label={backLabel} asChild>
          <Link href={backHref}>
            <ArrowLeft aria-hidden />
          </Link>
        </IconButton>
        <h1 className="flex-1 truncate font-display text-xl font-semibold">{title}</h1>
        <span className="rounded-full bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground">
          {table.table_label}
        </span>
        <LanguageToggle />
      </div>
    </header>
  );
}

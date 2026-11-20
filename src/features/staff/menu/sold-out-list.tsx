"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, SearchX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonList } from "@/components/states/skeletons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { normalize, pick } from "@/features/guest/menu/menu-model";
import { AppErrorException, asAppError, toAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { useStaffMenu } from "../queries";
import type { StaffMenuItem } from "../types";

/** Searchable list of items with an availability ("86") switch — optimistic, live everywhere. */
export function SoldOutList() {
  const t = useTranslations("staff");
  const tErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const menu = useStaffMenu();
  const [query, setQuery] = useState("");

  const toggle = useMutation({
    mutationFn: async ({ item, available }: { item: StaffMenuItem; available: boolean }) => {
      const { error } = await getBrowserSupabase().rpc("set_item_availability", {
        p_item_id: item.id,
        p_available: available,
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onMutate: async ({ item, available }) => {
      await qc.cancelQueries({ queryKey: qk.staffMenu() });
      const previous = qc.getQueryData<StaffMenuItem[]>(qk.staffMenu());
      qc.setQueryData<StaffMenuItem[]>(qk.staffMenu(), (list) =>
        (list ?? []).map((i) => (i.id === item.id ? { ...i, is_available: available } : i)),
      );
      return { previous };
    },
    onSuccess: (_d, { item, available }) => {
      const name = pick(item.name, item.name_bn, locale);
      toast.success(available ? t("nowAvailable", { name }) : t("nowSoldOut", { name }));
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.staffMenu(), ctx.previous);
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.staffMenu() }),
  });

  const groups = useMemo(() => {
    const q = normalize(query);
    const items = (menu.data ?? []).filter(
      (i) => !q || normalize(`${i.name} ${i.name_bn ?? ""}`).includes(q),
    );
    const byCat = new Map<string, { title: string; sort: number; items: StaffMenuItem[] }>();
    for (const i of items) {
      const cat = i.menu_categories;
      const g = byCat.get(i.category_id) ?? {
        title: cat ? pick(cat.name, cat.name_bn, locale) : "",
        sort: cat?.sort ?? 0,
        items: [],
      };
      g.items.push(i);
      byCat.set(i.category_id, g);
    }
    return [...byCat.values()].sort((a, b) => a.sort - b.sort);
  }, [menu.data, query, locale]);

  let body: React.ReactNode;
  if (menu.isPending) body = <SkeletonList label={tCommon("loading")} count={4} />;
  else if (menu.isError)
    body = (
      <ErrorState
        title={t("menuErrorTitle")}
        variant={asAppError(menu.error).network ? "offline" : "error"}
        onRetry={() => void menu.refetch()}
      />
    );
  else if (groups.length === 0) body = <EmptyState icon={SearchX} title={t("menuEmptyTitle")} />;
  else
    body = (
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title} className="space-y-2">
            <h2 className="font-medium text-muted-foreground">{g.title}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {g.items.map((item) => {
                const name = pick(item.name, item.name_bn, locale);
                const id = `avail-${item.id}`;
                return (
                  <li key={item.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                    <label
                      htmlFor={id}
                      className={cn(
                        "flex-1 font-medium",
                        !item.is_available && "text-muted-foreground line-through",
                      )}
                    >
                      {name}
                    </label>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        item.is_available ? "text-success" : "text-ember",
                      )}
                    >
                      {item.is_available ? t("available") : t("soldOut")}
                    </span>
                    <Switch
                      id={id}
                      checked={item.is_available}
                      aria-label={t("toggleAvailability", { name })}
                      onCheckedChange={(available) => toggle.mutate({ item, available })}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-medium">{t("menuTitle")}</h1>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("menuSearch")}
          aria-label={t("menuSearch")}
          className="pl-11"
        />
      </div>
      {body}
    </div>
  );
}

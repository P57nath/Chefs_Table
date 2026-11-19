"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCheck,
  GlassWater,
  Hand,
  MessageSquareMore,
  Receipt,
  Utensils,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonList } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { AppErrorException, asAppError, toAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { PULSE_CLASS } from "@/lib/status";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatAge } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { useOpenRequests } from "../queries";
import type { RequestType, StaffRequest } from "../types";

const ICONS: Record<RequestType, typeof Hand> = {
  call_waiter: Hand,
  request_bill: Receipt,
  water: GlassWater,
  cutlery: Utensils,
  other: MessageSquareMore,
};

function useUpdateRequest() {
  const qc = useQueryClient();
  const tErr = useTranslations("errors");
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "acknowledged" | "resolved" }) => {
      const { error } = await getBrowserSupabase().rpc("update_service_request", {
        p_request_id: id,
        p_status: status,
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: qk.staffRequests() });
      const previous = qc.getQueryData<StaffRequest[]>(qk.staffRequests());
      qc.setQueryData<StaffRequest[]>(qk.staffRequests(), (list) =>
        status === "resolved"
          ? (list ?? []).filter((r) => r.id !== id)
          : (list ?? []).map((r) =>
              r.id === id ? { ...r, status, acknowledged_at: new Date().toISOString() } : r,
            ),
      );
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.staffRequests(), ctx.previous);
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.staff() }),
  });
}

/** Live list of open guest requests with age; acknowledge or resolve. */
export function RequestsList() {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const now = useNow();
  const requests = useOpenRequests();
  const update = useUpdateRequest();

  let body: React.ReactNode;
  if (requests.isPending) body = <SkeletonList label={tCommon("loading")} count={3} />;
  else if (requests.isError)
    body = (
      <ErrorState
        title={t("requestsErrorTitle")}
        variant={asAppError(requests.error).network ? "offline" : "error"}
        onRetry={() => void requests.refetch()}
      />
    );
  else if (requests.data.length === 0)
    body = (
      <EmptyState icon={CheckCheck} title={t("requestsEmptyTitle")} body={t("requestsEmptyBody")} />
    );
  else
    body = (
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {requests.data.map((r) => {
          const Icon = ICONS[r.type];
          const open = r.status === "open";
          return (
            <li
              key={r.id}
              className={cn(
                "surface-raised flex items-start gap-3 rounded-2xl border bg-card p-4",
                open
                  ? cn("border-ember/60 text-ember", r.type === "call_waiter" && PULSE_CLASS.fast)
                  : "border-border",
              )}
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full",
                  open ? "bg-ember/15" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-1 text-foreground">
                <p className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-semibold">
                    {r.dining_tables?.label}
                  </span>
                  <span className="font-semibold">{t(`req_${r.type}`)}</span>
                </p>
                {r.note ? <p className="text-sm">{r.note}</p> : null}
                <p className="text-sm text-muted-foreground">
                  {now !== null ? formatAge(r.created_at, now, locale) : null}
                  {!open ? ` · ${t("acknowledgedBy")}` : null}
                </p>
                <div className="flex gap-2 pt-1">
                  {open ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => update.mutate({ id: r.id, status: "acknowledged" })}
                    >
                      {t("acknowledge")}
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => update.mutate({ id: r.id, status: "resolved" })}>
                    <Check aria-hidden />
                    {t("resolve")}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="font-display text-2xl font-semibold">{t("requestsTitle")}</h1>
      {body}
    </div>
  );
}

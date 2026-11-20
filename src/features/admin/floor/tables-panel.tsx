"use client";

import { Armchair, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { IconButton } from "@/components/common/icon-button";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SegmentedControl } from "@/components/common/segmented-control";

import { Field } from "../field";
import { tableSchema, type TableInput } from "../schemas";
import { saveTable, setTableActive } from "../server/floor-actions";
import { useRun } from "../use-run";
import type { AdminTable, AdminZone } from "./types";

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function TableForm({
  initial,
  zones,
  onClose,
}: {
  initial: TableInput;
  zones: AdminZone[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.floor");
  const { run, pending } = useRun();
  const [form, setForm] = useState(initial);
  const valid = tableSchema.safeParse(form).success;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) run(() => saveTable(form), { success: t("tableSaved"), onDone: onClose });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("label")} hint={t("labelHint")}>
          <Input
            value={form.label}
            maxLength={12}
            autoFocus
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </Field>
        <Field label={t("seats")}>
          <Input
            type="number"
            min={1}
            max={20}
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
          />
        </Field>
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("shape")}</span>
        <SegmentedControl<"round" | "square" | "rect">
          label={t("shape")}
          value={form.shape}
          onChange={(v) => setForm({ ...form, shape: v })}
          options={[
            { value: "round", label: t("shape_round") },
            { value: "square", label: t("shape_square") },
            { value: "rect", label: t("shape_rect") },
          ]}
        />
      </div>
      <Field label={t("zone")}>
        <select
          className={selectClass}
          value={form.zoneId ?? ""}
          onChange={(e) => setForm({ ...form, zoneId: e.target.value || null })}
        >
          <option value="">{t("noZone")}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </Field>
      <DialogFooter className="gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Table list: add, edit (label, seats, shape, zone), take out of service. */
export function TablesPanel({ tables, zones }: { tables: AdminTable[]; zones: AdminZone[] }) {
  const t = useTranslations("admin.floor");
  const { run } = useRun();
  const [editing, setEditing] = useState<AdminTable | "new" | null>(null);
  const zoneName = (id: string | null) => zones.find((z) => z.id === id)?.name ?? t("noZone");

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("addTable")}
        </Button>
      </div>
      {tables.length === 0 ? (
        <EmptyState icon={Armchair} title={t("noTablesTitle")} body={t("noTablesBody")} />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((tb) => (
            <li
              key={tb.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted font-medium">
                {tb.label}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">
                  {t("seatsCount", { count: tb.seats })} · {t(`shape_${tb.shape}`)}
                </span>
                <span className="block truncate text-muted-foreground">{zoneName(tb.zone_id)}</span>
              </span>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={tb.is_active}
                  aria-label={t("inServiceNamed", { label: tb.label })}
                  onCheckedChange={(v) =>
                    run(() => setTableActive(tb.id, v), {
                      success: v
                        ? t("activated", { label: tb.label })
                        : t("deactivated", { label: tb.label }),
                    })
                  }
                />
              </label>
              <IconButton
                size="icon-sm"
                label={t("editNamed", { label: tb.label })}
                onClick={() => setEditing(tb)}
              >
                <Pencil aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("addTable") : t("editTable")}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TableForm
              key={editing === "new" ? "new" : editing.id}
              zones={zones}
              onClose={() => setEditing(null)}
              initial={
                editing === "new"
                  ? { label: "", seats: 4, shape: "square", zoneId: zones[0]?.id ?? null }
                  : {
                      id: editing.id,
                      label: editing.label,
                      seats: editing.seats,
                      shape: editing.shape,
                      zoneId: editing.zone_id,
                    }
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { IconButton } from "@/components/common/icon-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { reorder } from "../server/menu-actions";
import { deleteZone, saveZone } from "../server/floor-actions";
import { SortableList } from "../sortable-list";
import { useRun } from "../use-run";
import type { AdminTable, AdminZone } from "./types";

function ZoneName({ zone }: { zone: AdminZone }) {
  const t = useTranslations("admin.floor");
  const { run, pending } = useRun();
  const [name, setName] = useState(zone.name);
  const dirty = name.trim() !== zone.name && name.trim().length > 0;
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) run(() => saveZone({ id: zone.id, name }), { success: t("zoneSaved") });
      }}
    >
      <Input
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        aria-label={t("zoneName")}
      />
      {dirty ? (
        <IconButton
          type="submit"
          size="icon-sm"
          label={t("saveNamed", { name })}
          disabled={pending}
        >
          <Check aria-hidden />
        </IconButton>
      ) : null}
    </form>
  );
}

/** Zones (Main Hall / Window / Terrace…): rename inline, reorder, add, delete. */
export function ZonesPanel({ zones, tables }: { zones: AdminZone[]; tables: AdminTable[] }) {
  const t = useTranslations("admin.floor");
  const { run, pending } = useRun();
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<AdminZone | null>(null);
  const inZone = (id: string) => tables.filter((x) => x.zone_id === id).length;

  return (
    <section className="max-w-xl space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim())
            run(() => saveZone({ name: newName }), {
              success: t("zoneSaved"),
              onDone: () => setNewName(""),
            });
        }}
      >
        <Input
          value={newName}
          maxLength={40}
          placeholder={t("newZonePlaceholder")}
          aria-label={t("newZone")}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" disabled={!newName.trim()} loading={pending}>
          <Plus aria-hidden />
          {t("addZone")}
        </Button>
      </form>
      {zones.length === 0 ? <p className="text-sm text-muted-foreground">{t("noZones")}</p> : null}
      <SortableList
        items={zones}
        ariaLabel={t("zones")}
        labelOf={(z) => z.name}
        onCommit={(ids) => run(() => reorder("zones", ids))}
      >
        {(z) => (
          <div className="flex items-center gap-2 py-1.5">
            <div className="flex-1">
              <ZoneName key={z.name} zone={z} />
            </div>
            <span className="text-sm whitespace-nowrap text-muted-foreground">
              {t("tablesCount", { count: inZone(z.id) })}
            </span>
            <IconButton
              size="icon-sm"
              label={t("deleteNamed", { name: z.name })}
              onClick={() => setDeleting(z)}
            >
              <Trash2 aria-hidden />
            </IconButton>
          </div>
        )}
      </SortableList>
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteZoneTitle", { name: deleting?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("deleteZoneBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{t("cancel")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              loading={pending}
              onClick={() =>
                deleting &&
                run(() => deleteZone(deleting.id), {
                  success: t("zoneDeleted"),
                  onDone: () => setDeleting(null),
                })
              }
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

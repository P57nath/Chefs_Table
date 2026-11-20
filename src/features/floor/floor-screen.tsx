"use client";

import { Box, LayoutGrid, List, Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/common/chip";
import { IconButton } from "@/components/common/icon-button";
import { SegmentedControl } from "@/components/common/segmented-control";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonBlock } from "@/components/states/skeletons";
import { useStaff } from "@/features/staff/staff-context";
import { localizeDigits } from "@/lib/digits";
import { asAppError } from "@/lib/errors";
import { formatElapsed } from "@/lib/time";
import { useMediaQuery } from "@/lib/use-media-query";
import { useNow } from "@/lib/use-now";

import { useFloor, useZones } from "./floor-data";
import { FloorList, type TableWithStatus } from "./floor-list";
import { FloorMap } from "./floor-map";
import { occupancy, tableStatus } from "./status";
import { TableSheet } from "./table-sheet";
import { hasWebGL, useFloorView, type FloorView } from "./use-floor-view";

// The whole three.js bundle loads only here, only when the 3D view is shown.
const FloorScene = dynamic(() => import("./floor-3d/floor-scene"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-full w-full rounded-2xl" />,
});

const noop = () => () => {};

/** Staff home: the live floor in 3D, 2D map or list, with zone filter and table sheet. */
export function FloorScreen() {
  const t = useTranslations("floor");
  const tState = useTranslations("tableState");
  const locale = useLocale();
  const now = useNow();
  const { staff } = useStaff();
  const floor = useFloor();
  const zones = useZones();
  const narrow = useMediaQuery("(max-width: 767px)", false);
  const webglOk = useSyncExternalStore(noop, hasWebGL, () => true);
  const [storedView, setView] = useFloorView();
  const [tooSlow, setTooSlow] = useState(false);
  const [zone, setZone] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedId) setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, selectedId]);

  const wanted: FloorView = storedView ?? (narrow ? "list" : "3d");
  const view: FloorView = wanted === "3d" && (!webglOk || tooSlow) ? "2d" : wanted;

  const rows: TableWithStatus[] = useMemo(
    () =>
      (floor.data ?? [])
        .filter((tb) => zone === null || tb.zone_id === zone)
        .map((table) => ({ table, status: tableStatus(table, now ?? 0) })),
    [floor.data, zone, now],
  );
  const selected = floor.data?.find((tb) => tb.table_id === selectedId) ?? null;
  const occ = occupancy(floor.data ?? []);
  const usedZones = (zones.data ?? []).filter((z) => floor.data?.some((tb) => tb.zone_id === z.id));
  const sortedRows = [...rows].sort((a, b) =>
    a.table.label.localeCompare(b.table.label, undefined, { numeric: true }),
  );

  function describe(r: TableWithStatus): string {
    const parts = [tState(r.status.state)];
    if (r.table.session) parts.push(t("items", { count: r.status.counts.items }));
    if (r.status.since && now !== null)
      parts.push(formatElapsed(now - new Date(r.status.since).getTime(), locale));
    return t("liveTable", { label: r.table.label, state: parts.join(", ") });
  }

  let body: React.ReactNode;
  if (floor.isPending)
    body = <SkeletonBlock className="h-[calc(100dvh-10rem)] min-h-[520px] w-full rounded-2xl" />;
  else if (floor.isError)
    body = (
      <ErrorState
        title={t("errorTitle")}
        variant={asAppError(floor.error).network ? "offline" : "error"}
        onRetry={() => void floor.refetch()}
      />
    );
  else if ((floor.data ?? []).length === 0)
    body = <EmptyState icon={LayoutGrid} title={t("emptyTitle")} body={t("emptyBody")} />;
  else if (view === "list")
    body = <FloorList rows={rows} onOpen={(tb) => setSelectedId(tb.table_id)} />;
  else if (view === "2d")
    body = (
      <FloorMap
        rows={rows}
        zones={zones.data ?? []}
        selectedId={selectedId}
        onOpen={(tb) => setSelectedId(tb.table_id)}
      />
    );
  else
    body = (
      <div
        className={
          expanded
            ? "fixed inset-0 z-40 bg-background"
            : "relative h-[calc(100dvh-10rem)] min-h-[520px] overflow-hidden rounded-2xl border border-border"
        }
      >
        <FloorScene
          rows={rows}
          zones={zones.data ?? []}
          selectedId={selectedId}
          focusedId={focusedId}
          waiterColor={staff.avatarColor}
          onOpen={(tb) => setSelectedId(tb.table_id)}
          onTooSlow={() => {
            setTooSlow(true);
            toast(t("slowFallback"));
          }}
        />
        <div className="absolute top-3 right-3">
          <IconButton
            label={expanded ? t("collapseFloor") : t("expandFloor")}
            variant="secondary"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          </IconButton>
        </div>
        {/* Keyboard & screen-reader layer: Tab cycles tables in label order, Enter opens. */}
        <ul aria-label={t("tablesLabel")} className="sr-only">
          {sortedRows.map((r) => (
            <li key={r.table.table_id}>
              <button
                type="button"
                onFocus={() => {
                  setFocusedId(r.table.table_id);
                  setAnnounce(describe(r));
                }}
                onBlur={() => setFocusedId(null)}
                onClick={() => setSelectedId(r.table.table_id)}
              >
                {t("openTable", { label: r.table.label, state: tState(r.status.state) })}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium">{t("title")}</h1>
        <span className="font-mono text-sm text-muted-foreground tabular-nums">
          {t("occupied", {
            occupied: localizeDigits(occ.occupied, locale),
            total: localizeDigits(occ.total, locale),
          })}
        </span>
        <div className="ml-auto">
          <SegmentedControl<FloorView>
            label={t("viewLabel")}
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "3d", label: t("view3d"), icon: <Box aria-hidden /> },
              { value: "2d", label: t("view2d"), icon: <MapIcon aria-hidden /> },
              { value: "list", label: t("viewList"), icon: <List aria-hidden /> },
            ]}
          />
        </div>
      </div>
      {wanted === "3d" && !webglOk ? (
        <p className="text-sm text-muted-foreground">{t("noWebgl")}</p>
      ) : null}
      {usedZones.length > 1 ? (
        <div role="group" aria-label={t("zonesLabel")} className="flex flex-wrap gap-2">
          <Chip size="sm" active={zone === null} onClick={() => setZone(null)}>
            {t("zoneAll")}
          </Chip>
          {usedZones.map((z) => (
            <Chip key={z.id} size="sm" active={zone === z.id} onClick={() => setZone(z.id)}>
              {z.name}
            </Chip>
          ))}
        </div>
      ) : null}
      {body}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <TableSheet table={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

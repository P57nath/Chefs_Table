"use client";

import { Download, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { useState } from "react";

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

import { rotateQr } from "../server/floor-actions";
import { useRun } from "../use-run";

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

/** One table's QR: preview, PNG / SVG download, rotate (with confirmation). */
export function QrCard({
  tableId,
  label,
  url,
  svg,
}: {
  tableId: string;
  label: string;
  url: string;
  svg: string;
}) {
  const t = useTranslations("admin.qr");
  const { run, pending } = useRun();
  const [confirm, setConfirm] = useState(false);
  const file = `table-${label.replace(/[^a-z0-9-]/gi, "_")}`;

  return (
    <li
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
      data-qr-table={label}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">{t("table", { label })}</h2>
      </div>
      <div
        className="mx-auto w-40 rounded-xl bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
        role="img"
        aria-label={t("qrFor", { label })}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="truncate text-center text-xs text-muted-foreground" title={url}>
        {url}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={async () =>
            download(await QRCode.toDataURL(url, { width: 1024, margin: 2 }), `${file}.png`)
          }
        >
          <Download aria-hidden />
          PNG
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            download(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), `${file}.svg`)
          }
        >
          <Download aria-hidden />
          SVG
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
        <RefreshCw aria-hidden />
        {t("rotate")}
      </Button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rotateTitle", { label })}</DialogTitle>
            <DialogDescription>{t("rotateBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{t("cancel")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              loading={pending}
              onClick={() =>
                run(() => rotateQr(tableId), {
                  success: t("rotated", { label }),
                  onDone: () => setConfirm(false),
                })
              }
            >
              {t("rotateConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

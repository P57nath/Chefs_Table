"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdmin } from "@/features/admin/admin-context";
import { MENU_BUCKET, menuImageUrl } from "@/lib/storage";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { uuidv4 } from "@/lib/uuid";
import { cn } from "@/lib/utils";

import { clamp, cropRect, outputSize, panDelta } from "./crop";

const PREVIEW_W = 320;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

async function encode(canvas: HTMLCanvasElement): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpg = await toBlob("image/jpeg"); // browsers without WebP encoding
  if (!jpg) throw new Error("encode");
  return { blob: jpg, ext: "jpg" };
}

/**
 * Pick → crop (fixed aspect, zoom + drag / arrow keys) → WebP in the browser
 * → upload to Storage under `{restaurant_id}/…`. Calls `onChange(path)`.
 */
export function ImageUploader({
  value,
  onChange,
  aspect,
  maxWidth,
  prefix,
  label,
  round = false,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  aspect: number;
  maxWidth: number;
  prefix: string;
  label: string;
  round?: boolean;
}) {
  const t = useTranslations("admin.image");
  const { restaurantId } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const previewH = Math.round(PREVIEW_W / aspect);
  const url = menuImageUrl(value);

  useEffect(() => {
    const c = canvasRef.current;
    if (!img || !c) return;
    const r = cropRect(img.naturalWidth, img.naturalHeight, aspect, zoom, pan.x, pan.y);
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    ctx?.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, c.width, c.height);
  }, [img, zoom, pan, aspect]);

  function pick(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) {
      setError(t("badFile"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const el = new window.Image();
    el.onload = () => {
      setImg(el);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    el.onerror = () => setError(t("badFile"));
    el.src = objectUrl;
  }

  function nudge(dx: number, dy: number) {
    setPan((p) => ({ x: clamp(p.x + dx, -1, 1), y: clamp(p.y + dy, -1, 1) }));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !img) return;
    const r = cropRect(img.naturalWidth, img.naturalHeight, aspect, zoom, pan.x, pan.y);
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    nudge(
      panDelta(dx, PREVIEW_W, img.naturalWidth - r.sw, r.sw),
      panDelta(dy, previewH, img.naturalHeight - r.sh, r.sh),
    );
  }

  async function save() {
    if (!img) return;
    setBusy(true);
    setError(null);
    try {
      const r = cropRect(img.naturalWidth, img.naturalHeight, aspect, zoom, pan.x, pan.y);
      const size = outputSize(r, maxWidth, aspect);
      const out = document.createElement("canvas");
      out.width = size.width;
      out.height = size.height;
      out.getContext("2d")?.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, size.width, size.height);
      const { blob, ext } = await encode(out);
      const path = `${restaurantId}/${prefix}-${uuidv4()}.${ext}`;
      const { error: upErr } = await getBrowserSupabase()
        .storage.from(MENU_BUCKET)
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;
      onChange(path);
      setImg(null);
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden border border-border bg-muted text-muted-foreground",
            round ? "size-20 rounded-full" : "h-24 w-32 rounded-xl",
          )}
        >
          {url ? (
            <Image src={url} alt="" fill sizes="128px" className="object-cover" />
          ) : (
            <ImagePlus className="size-6" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus aria-hidden />
            {url ? t("replace") : t("upload")}
          </Button>
          {url ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 aria-hidden />
              {t("remove")}
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label={label}
          data-testid={`upload-${prefix}`}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-ember">
          {error}
        </p>
      ) : null}

      <Dialog open={img !== null} onOpenChange={(o) => !o && !busy && setImg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cropTitle")}</DialogTitle>
            <DialogDescription>{t("cropHint")}</DialogDescription>
          </DialogHeader>
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={previewH}
            tabIndex={0}
            aria-label={t("cropArea")}
            className={cn(
              "mx-auto w-full max-w-80 cursor-grab touch-none bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              round ? "rounded-full" : "rounded-xl",
            )}
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={(e) => {
              const step = 0.1;
              const map: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const d = map[e.key];
              if (d) {
                e.preventDefault();
                nudge(d[0], d[1]);
              }
            }}
          />
          <label className="flex items-center gap-3 text-sm">
            {t("zoom")}
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-11 flex-1 accent-primary"
            />
          </label>
          <DialogFooter className="gap-2">
            <Button type="button" variant="secondary" onClick={() => setImg(null)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={save} loading={busy}>
              {t("useImage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Pure crop math for the image uploader (unit-tested). The crop is the
 * largest `aspect` rectangle inside the image, shrunk by `zoom` (1–4) and
 * moved by `pan` (-1…1 on each axis, 0 = centred) within the free space.
 */
export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function cropRect(
  imgW: number,
  imgH: number,
  aspect: number,
  zoom: number,
  panX: number,
  panY: number,
): CropRect {
  const z = clamp(zoom, 1, 4);
  let sw = imgW;
  let sh = imgW / aspect;
  if (sh > imgH) {
    sh = imgH;
    sw = imgH * aspect;
  }
  sw /= z;
  sh /= z;
  const freeX = imgW - sw;
  const freeY = imgH - sh;
  return {
    sx: (freeX / 2) * (1 + clamp(panX, -1, 1)),
    sy: (freeY / 2) * (1 + clamp(panY, -1, 1)),
    sw,
    sh,
  };
}

/** Output size: never upscale, cap the width. */
export function outputSize(rect: CropRect, maxWidth: number, aspect: number) {
  const width = Math.round(Math.min(rect.sw, maxWidth));
  return { width, height: Math.round(width / aspect) };
}

/** Converts a drag (in preview pixels) into a pan delta given the free space. */
export function panDelta(dragPx: number, previewSize: number, imgFree: number, cropSize: number) {
  if (imgFree <= 0) return 0;
  // 1 preview px ≈ cropSize / previewSize image px; pan range (-1…1) spans imgFree px.
  return -((dragPx * cropSize) / previewSize / (imgFree / 2));
}

import "server-only";

import QRCode from "qrcode";

import { publicEnv } from "@/lib/env";

/** The URL printed in a table's QR code. */
export function tableUrl(token: string): string {
  return `${publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/t/${encodeURIComponent(token)}`;
}

/** Crisp vector QR (error correction M: survives a little wear on printed tents). */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

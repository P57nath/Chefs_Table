"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

import { useNonce } from "./nonce";

/**
 * Inline pre-paint script inserted only into the server-rendered HTML.
 * Rendering <script> from a component on the client triggers a React 19 warning
 * and never executes anyway, so client navigations simply skip it.
 */
export function HeadScript({ html }: { html: string }) {
  const inserted = useRef(false);
  const nonce = useNonce();
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: html }} />;
  });
  return null;
}

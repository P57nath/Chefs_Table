"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

/**
 * Inline pre-paint script inserted only into the server-rendered HTML.
 * Rendering <script> from a component on the client triggers a React 19 warning
 * and never executes anyway, so client navigations simply skip it.
 */
export function HeadScript({ html }: { html: string }) {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: html }} />;
  });
  return null;
}

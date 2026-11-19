import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import bn from "@/i18n/messages/bn.json";
import en from "@/i18n/messages/en.json";

/** Render with translations (and Dhaka time zone) like the real app. */
export function renderWithIntl(
  ui: ReactElement,
  { locale = "en", ...options }: { locale?: "en" | "bn" } & RenderOptions = {},
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "bn" ? bn : en}
      timeZone="Asia/Dhaka"
    >
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}

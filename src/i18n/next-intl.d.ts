import type admin from "./messages/admin.en.json";
import type en from "./messages/en.json";
import type { Locale } from "./config";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en & { admin: typeof admin };
  }
}

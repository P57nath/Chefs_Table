import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

/** Only the landing page is indexable (spec §8). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/t/", "/staff", "/kitchen", "/admin", "/login", "/api/", "/dev/"],
    },
    host: publicEnv.NEXT_PUBLIC_APP_URL,
  };
}

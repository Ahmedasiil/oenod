import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

// Public pages are open to search engines; the app, admin and private links are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/me", "/api", "/invite", "/pay", "/quote", "/p/", "/reset", "/unsubscribe"] }],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}

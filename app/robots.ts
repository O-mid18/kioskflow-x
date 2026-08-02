import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/owner/", "/admin/", "/api/"],
      },
    ],
    sitemap: "https://www.myflowie.de/sitemap.xml",
  };
}

import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://butlr.cloud";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-02-21"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-02-21"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/acceptable-use`,
      lastModified: new Date("2026-02-21"),
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/imprint`,
      lastModified: new Date("2026-02-21"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}

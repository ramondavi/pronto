import type { MetadataRoute } from "next";

const siteUrl = "https://prontobib.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/ajuda`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/politica-de-privacidade`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/acessibilidade`, changeFrequency: "yearly", priority: 0.4 },
  ];
}

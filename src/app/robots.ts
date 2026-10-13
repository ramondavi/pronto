import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/ajuda", "/politica-de-privacidade"],
      disallow: ["/api/", "/auth/", "/cadastro", "/coordenacao/", "/entrar", "/painel/", "/recuperar-senha", "/redefinir-senha"],
    },
    sitemap: "https://prontobib.vercel.app/sitemap.xml",
  };
}

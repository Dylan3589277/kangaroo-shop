import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { buildAbsoluteUrl, buildLocaleAlternates } from '@/lib/seo';

const locales = routing.locales.filter((l) => typeof l === "string") as string[];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages shared across all locales
  const staticPaths = ["", "/products", "/about", "/contact", "/privacy", "/terms"];

  // Generate sitemap entries for each locale
  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: buildAbsoluteUrl(`/${locale}${path}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1.0 : path === "/products" ? 0.9 : 0.7,
      alternates: {
        languages: buildLocaleAlternates(path),
      },
    }))
  );

  // Dynamic product pages from database
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    productEntries = locales.flatMap((locale) =>
      products.map((product) => ({
        url: buildAbsoluteUrl(`/${locale}/products/${product.id}`),
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: {
          languages: buildLocaleAlternates(`/products/${product.id}`),
        },
      }))
    );
  } catch {
    // If DB is unreachable at build time, skip product entries
    console.warn("Could not fetch products for sitemap — database may be unavailable.");
  }

  return [...staticEntries, ...productEntries];
}

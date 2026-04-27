import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://kangaroo-shop-tan.vercel.app"),
  title: {
    default: "Kangaroo Shop | From Japan to the World",
    template: "%s | Kangaroo Shop",
  },
  description:
    "Kangaroo Shop is a cross-border e-commerce platform connecting Japan with the world. Discover curated Japanese products — from Italian Brainrot collectibles to anime goods, baby products, and lifestyle items — shipped globally.",
  keywords: [
    "Japanese products",
    "cross-border e-commerce",
    "Japan shopping",
    "Italian Brainrot",
    "anime goods",
    "Japanese lifestyle",
    "Japan to world",
    "Japanese marketplace",
    "Kangaroo Shop",
  ],
  authors: [{ name: "Kangaroo Shop" }],
  creator: "Kangaroo Shop",
  publisher: "Kangaroo Shop",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ja_JP", "zh_CN", "ko_KR", "de_DE", "fr_FR", "it_IT", "es_ES", "th_TH", "id_ID", "vi_VN"],
    siteName: "Kangaroo Shop",
    title: "Kangaroo Shop | From Japan to the World",
    description:
      "Curated Japanese products shipped worldwide. Italian Brainrot, anime goods, baby products, and more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kangaroo Shop - From Japan to the World",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kangaroo Shop | From Japan to the World",
    description:
      "Curated Japanese products shipped worldwide. Italian Brainrot, anime goods, baby products, and more.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://kangaroo-shop-tan.vercel.app",
    languages: {
      "en-US": "https://kangaroo-shop-tan.vercel.app/en",
      "en-GB": "https://kangaroo-shop-tan.vercel.app/en",
      "en-AU": "https://kangaroo-shop-tan.vercel.app/en",
      "zh-CN": "https://kangaroo-shop-tan.vercel.app/zh",
      "zh-TW": "https://kangaroo-shop-tan.vercel.app/zh",
      "ja-JP": "https://kangaroo-shop-tan.vercel.app/ja",
      "ko-KR": "https://kangaroo-shop-tan.vercel.app/ko",
      "de-DE": "https://kangaroo-shop-tan.vercel.app/de",
      "fr-FR": "https://kangaroo-shop-tan.vercel.app/fr",
      "it-IT": "https://kangaroo-shop-tan.vercel.app/it",
      "es-ES": "https://kangaroo-shop-tan.vercel.app/es",
      "th-TH": "https://kangaroo-shop-tan.vercel.app/th",
      "id-ID": "https://kangaroo-shop-tan.vercel.app/id",
      "vi-VN": "https://kangaroo-shop-tan.vercel.app/vi",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

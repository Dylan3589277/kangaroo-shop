import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://kangaroo-shop-orpin.vercel.app"),
  title: {
    default: "Kangaroo Shop | China Sourcing for Global Commerce",
    template: "%s | Kangaroo Shop",
  },
  description:
    "Kangaroo Shop sources and imports products from China for global customers, with Japan, Europe and North America as key markets.",
  keywords: [
    "China sourcing",
    "import products",
    "cross-border e-commerce",
    "global commerce",
    "Italian Brainrot",
    "anime goods",
    "lifestyle goods",
    "Japan market",
    "Europe market",
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
    title: "Kangaroo Shop | China Sourcing for Global Commerce",
    description:
      "Products sourced and imported from China for global customers, focused on Japan, Europe and North America.",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "Kangaroo Shop - China Sourcing for Global Commerce",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kangaroo Shop | China Sourcing for Global Commerce",
    description:
      "Products sourced and imported from China for global customers.",
    images: ["/og"],
  },
  alternates: {
    canonical: "https://kangaroo-shop-orpin.vercel.app",
    languages: {
      "en-US": "https://kangaroo-shop-orpin.vercel.app/en",
      "en-GB": "https://kangaroo-shop-orpin.vercel.app/en",
      "en-AU": "https://kangaroo-shop-orpin.vercel.app/en",
      "zh-CN": "https://kangaroo-shop-orpin.vercel.app/zh",
      "zh-TW": "https://kangaroo-shop-orpin.vercel.app/zh",
      "ja-JP": "https://kangaroo-shop-orpin.vercel.app/ja",
      "ko-KR": "https://kangaroo-shop-orpin.vercel.app/ko",
      "de-DE": "https://kangaroo-shop-orpin.vercel.app/de",
      "fr-FR": "https://kangaroo-shop-orpin.vercel.app/fr",
      "it-IT": "https://kangaroo-shop-orpin.vercel.app/it",
      "es-ES": "https://kangaroo-shop-orpin.vercel.app/es",
      "th-TH": "https://kangaroo-shop-orpin.vercel.app/th",
      "id-ID": "https://kangaroo-shop-orpin.vercel.app/id",
      "vi-VN": "https://kangaroo-shop-orpin.vercel.app/vi",
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

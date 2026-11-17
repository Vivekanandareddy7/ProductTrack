import type { Metadata } from "next";
import { Inter, Charm } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/common/header";
import Footer from "@/components/layout/footer";
import RouteFooter from "@/components/route-footer";
import LenisProvider from "@/components/providers/lenis-provider";

const inter = Inter({ subsets: ["latin"] });
const charm = Charm({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-charm",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://producttrack.com"),
  title: {
    default: "ProductTrack | Smart Price Tracker",
    template: "%s | ProductTrack",
  },
  description:
    "ProductTrack monitors product prices across e-commerce websites and sends instant alerts when prices drop. Save money by buying at the right time.",
  keywords: [
    "price tracker",
    "price monitor",
    "deal finder",
    "shopping savings",
    "price alerts",
    "ecommerce tracking",
    "track prices",
    "price comparison",
    "best price finder",
    "shopping tool",
  ],
  authors: [{ name: "VivekanandaReddy", url: "https://github.com/Vivekanandareddy7" }],
  creator: "VivekanandaReddy",
  publisher: "ProductTrack",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
    url: "https://producttrack.com",
    siteName: "ProductTrack",
    title: "ProductTrack | Smart Price Tracker",
    description:
      "Track product prices across e-commerce websites and get notified when prices drop. Save money by buying at the right time.",
    images: [
      {
        url: "/banner.webp",
        width: 1200,
        height: 630,
        alt: "ProductTrack - Smart Price Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProductTrack | Smart Price Tracker",
    description:
      "Track product prices across e-commerce websites and get notified when prices drop.",
    images: ["/banner.webp"],
    creator: "@producttrack",
    site: "@producttrack",
  },
  facebook: {
    appId: "",
  },
  appleWebApp: {
    capable: true,
    title: "ProductTrack",
    statusBarStyle: "black-translucent",
  },
  alternates: {
    canonical: "https://producttrack.com",
    languages: {
      en: "https://producttrack.com",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${charm.variable} antialiased`}>
        <Analytics />
        <LenisProvider>
          <Header />
          {children}
          <RouteFooter>
            <Footer />
          </RouteFooter>
          <Toaster richColors />
        </LenisProvider>
      </body>
    </html>
  );
}

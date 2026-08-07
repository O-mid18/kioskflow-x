import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Inter, Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flowio — B2B Marktplatz für Getränke & Snacks in Frankfurt",
  description: "Flowio verbindet Kiosk- und Späti-Betreiber in Frankfurt direkt mit lokalen Getränke- und Snack-Herstellern. Keine Mindestmenge, keine Zwischenhändler, Lieferung in 24 Stunden.",
  keywords: ["Kiosk", "Spaeti", "Grosshandel", "Frankfurt", "B2B", "Getraenke", "Snacks"],
  authors: [{ name: "Flowio" }],
  metadataBase: new URL("https://www.myflowie.de"),
  openGraph: {
    title: "Flowio — B2B Marktplatz für Getränke & Snacks in Frankfurt",
    description: "Direkt vom Hersteller zum Kiosk. Keine Mindestmenge, keine Zwischenhändler, Lieferung in 24 Stunden in Frankfurt.",
    url: "https://www.myflowie.de",
    siteName: "Flowio",
    locale: "de_DE",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Flowio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flowio — B2B Marktplatz für Getränke & Snacks in Frankfurt",
    description: "Direkt vom Hersteller zum Kiosk. Keine Mindestmenge, keine Zwischenhändler, Lieferung in 24 Stunden in Frankfurt.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${inter.variable} ${syne.variable} ${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('kf-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');})();` }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}

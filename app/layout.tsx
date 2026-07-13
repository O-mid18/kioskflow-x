import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Flowio — Direkt vom Hersteller zum Kiosk",
  description: "B2B Marktplatz fuer lokale Marken und Kiosk-Betreiber in Frankfurt. Keine Mindestmengen. Keine Zwischenhaendler.",
  keywords: ["Kiosk", "Spaeti", "Grosshandel", "Frankfurt", "B2B", "Getraenke", "Snacks"],
  authors: [{ name: "Flowio" }],
  metadataBase: new URL("https://kioskflow-x.vercel.app"),
  openGraph: {
    title: "Flowio — Direkt vom Hersteller zum Kiosk",
    description: "B2B Marktplatz fuer lokale Marken und Kiosk-Betreiber in Frankfurt.",
    url: "https://kioskflow-x.vercel.app",
    siteName: "Flowio",
    locale: "de_DE",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Flowio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flowio — Direkt vom Hersteller zum Kiosk",
    description: "B2B Marktplatz fuer lokale Marken und Kiosk-Betreiber in Frankfurt.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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

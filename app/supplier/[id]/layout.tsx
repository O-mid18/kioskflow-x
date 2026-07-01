import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lieferant | KioskFlow",
  description: "Produkte direkt vom Hersteller auf KioskFlow.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

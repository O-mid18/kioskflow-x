import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lieferant | Vendoro",
  description: "Produkte direkt vom Hersteller auf Vendoro.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

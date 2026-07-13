import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lieferanten-Dashboard | Flowio",
  description: "Verwalte deine Produkte und Bestellungen als Lieferant.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lieferant | Flowio",
  description: "Produkte direkt vom Hersteller auf Flowio.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

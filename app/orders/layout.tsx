import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bestellungen | Flowio",
  description: "Verwalte deine Bestellungen auf Flowio.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

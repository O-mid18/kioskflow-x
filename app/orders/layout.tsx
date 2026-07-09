import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bestellungen | Vendoro",
  description: "Verwalte deine Bestellungen auf Vendoro.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

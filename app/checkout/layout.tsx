import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kasse | Vendoro",
  description: "Schliesse deine Bestellung sicher ab.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

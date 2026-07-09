import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produkt hinzufuegen | Vendoro",
  description: "Neues Produkt im Vendoro Marktplatz einstellen.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

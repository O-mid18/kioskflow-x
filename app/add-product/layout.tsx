import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produkt hinzufuegen | Flowio",
  description: "Neues Produkt im Flowio Marktplatz einstellen.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

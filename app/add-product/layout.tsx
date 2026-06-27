import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produkt hinzufuegen | KioskFlow",
  description: "Neues Produkt im KioskFlow Marktplatz einstellen.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marktplatz | Vendoro",
  description: "Entdecke Getraenke und Snacks von lokalen Lieferanten.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

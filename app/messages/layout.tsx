import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nachrichten | Vendoro",
  description: "Nachrichten mit Lieferanten auf Vendoro.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

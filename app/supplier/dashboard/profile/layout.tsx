import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil | Vendoro",
  description: "Lieferantenprofil verwalten.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

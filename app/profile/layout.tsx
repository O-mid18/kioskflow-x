import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil | Vendoro",
  description: "Dein Vendoro-Profil verwalten.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

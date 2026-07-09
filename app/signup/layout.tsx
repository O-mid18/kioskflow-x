import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrieren | Vendoro",
  description: "Erstelle dein Vendoro-Konto.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

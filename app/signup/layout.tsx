import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrieren | KioskFlow",
  description: "Erstelle dein KioskFlow-Konto.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

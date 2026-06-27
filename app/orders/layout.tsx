import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bestellungen | KioskFlow",
  description: "Verwalte deine Bestellungen auf KioskFlow.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil | KioskFlow",
  description: "Dein KioskFlow-Profil verwalten.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

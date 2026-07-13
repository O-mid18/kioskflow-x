import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrieren | Flowio",
  description: "Erstelle dein Flowio-Konto.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

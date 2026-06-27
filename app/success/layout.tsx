import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bestellung erfolgreich | KioskFlow",
  description: "Deine Bestellung wurde erfolgreich aufgegeben.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

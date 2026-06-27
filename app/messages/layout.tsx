import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nachrichten | KioskFlow",
  description: "Nachrichten mit Lieferanten auf KioskFlow.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

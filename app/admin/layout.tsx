import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel | KioskFlow",
  description: "KioskFlow Administrationsbereich.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

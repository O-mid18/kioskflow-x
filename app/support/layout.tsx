import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | KioskFlow",
  description: "Hilfe und Support fuer KioskFlow-Nutzer.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

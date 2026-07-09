import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifizierung | Vendoro",
  description: "Lieferanten-Verifizierung.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

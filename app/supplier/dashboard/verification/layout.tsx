import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifizierung | Flowio",
  description: "Lieferanten-Verifizierung.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

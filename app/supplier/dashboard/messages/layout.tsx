import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nachrichten | Vendoro",
  description: "Nachrichten im Lieferanten-Portal.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

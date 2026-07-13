import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nachrichten | Flowio",
  description: "Nachrichten mit Lieferanten auf Flowio.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

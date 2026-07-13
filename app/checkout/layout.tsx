import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kasse | Flowio",
  description: "Schliesse deine Bestellung sicher ab.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

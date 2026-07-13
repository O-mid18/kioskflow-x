import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytik | Flowio",
  description: "Umsatz- und Bestellanalyse.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

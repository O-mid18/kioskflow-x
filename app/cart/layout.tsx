import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warenkorb | Vendoro",
  description: "Dein Warenkorb auf Vendoro.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel | Vendoro",
  description: "Vendoro Administrationsbereich.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

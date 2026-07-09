import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Vendoro",
  description: "Hilfe und Support fuer Vendoro-Nutzer.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

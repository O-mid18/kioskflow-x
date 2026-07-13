import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Flowio",
  description: "Hilfe und Support fuer Flowio-Nutzer.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

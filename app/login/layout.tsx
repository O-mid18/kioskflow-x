import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden | Vendoro",
  description: "Melde dich bei deinem Vendoro-Konto an.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

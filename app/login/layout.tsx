import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden | KioskFlow",
  description: "Melde dich bei deinem KioskFlow-Konto an.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

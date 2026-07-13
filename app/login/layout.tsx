import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden | Flowio",
  description: "Melde dich bei deinem Flowio-Konto an.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warenkorb | KioskFlow",
  description: "Dein Warenkorb auf KioskFlow.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

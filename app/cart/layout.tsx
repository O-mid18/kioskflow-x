import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warenkorb | Flowio",
  description: "Dein Warenkorb auf Flowio.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

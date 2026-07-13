import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produkte | Flowio",
  description: "Deine Produkte verwalten.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

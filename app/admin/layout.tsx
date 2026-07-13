import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel | Flowio",
  description: "Flowio Administrationsbereich.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

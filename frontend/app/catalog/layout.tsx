import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plant catalog — Plearn",
  description: "Browse all 936 plants in Plearn's database and see your personalized compatibility score for any of them.",
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}

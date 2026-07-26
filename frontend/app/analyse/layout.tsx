import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyse your space — Plearn",
  description: "Tell Plearn about your location, light, space, and experience to get a live, explained plant analysis.",
};

export default function AnalyseLayout({ children }: { children: React.ReactNode }) {
  return children;
}

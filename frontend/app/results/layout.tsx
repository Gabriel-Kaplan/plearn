import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your results — Plearn",
  description: "Your ranked plant analysis, full compatibility breakdowns, hidden gems, and botanical substitutions.",
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

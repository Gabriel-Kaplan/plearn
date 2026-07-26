import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works — Plearn",
  description: "The dataset, the two models, a real bug I caught and fixed, and how confidence and explanations are generated for every score.",
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

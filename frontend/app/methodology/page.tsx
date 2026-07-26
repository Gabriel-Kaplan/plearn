"use client";

import { useRef, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Dices, Gauge, ArrowUp, ArrowDown, Shuffle,
  Sparkles, Layers, Bug, Database,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({
  children, className, delay = 0,
}: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, color = "#2D5A3D" }: { children: ReactNode; color?: string }) {
  return (
    <p className="text-[11.5px] font-bold tracking-[0.1em] uppercase font-[Sora] mb-4" style={{ color }}>
      {children}
    </p>
  );
}

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; margin: 0; background: #ffffff; }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[1040px]">
        <div className="rounded-[28px] border bg-white/90 backdrop-blur-xl border-black/[0.07] shadow-[0_10px_34px_rgba(17,24,17,0.10)]">
          <div className="h-14 flex items-center justify-between px-5">
            <Link href="/" className="shrink-0">
              <Image src="/plearnlogo.png" alt="Plearn" width={92} height={20} />
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/catalog"
                className="hidden sm:block text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-3.5 py-2 rounded-full transition-colors">
                Plant catalog
              </Link>
              <Link href="/"
                className="flex items-center gap-1.5 text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-3.5 py-2 rounded-full transition-colors">
                <ArrowLeft size={14} />
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-20 px-6">
        <div className="max-w-[760px] mx-auto text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold text-[#2D5A3D] tracking-[0.05em] uppercase font-[Sora] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] inline-block" />
              Under the hood
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="font-[Sora] font-extrabold leading-[1.08] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>
              The engineering behind every score.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="text-[#4B5563] leading-[1.7] max-w-[560px] mx-auto" style={{ fontSize: "16.5px" }}>
              No black box. This is the dataset, the two models, a real mistake I caught and fixed,
              and exactly how the confidence number and the &ldquo;why this score&rdquo; factors on your
              results are actually generated.
            </p>
          </Reveal>
        </div>
      </section>

      {/* THE DATASET */}
      <section className="px-6 pb-24">
        <div className="max-w-[1000px] mx-auto">
          <Reveal>
            <Eyebrow>The dataset</Eyebrow>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.03em] leading-[1.15] max-w-[600px] mb-10"
              style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>
              936 plants. 69 engineered features each. Nothing off the shelf.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-[#4B5563] leading-[1.75] max-w-[680px] mb-10" style={{ fontSize: "15px" }}>
              The raw data comes from the Perenual API, pulled across 17 filters and de-duplicated down to
              936 unique varieties. On its own that data says what a plant <em>is</em> — its family, basic
              care notes — but nothing about whether it would actually survive on a specific balcony in Tel
              Aviv in August. Every feature that predicts <em>that</em> had to be engineered by hand: six
              composite scoring functions (beginner ease, drought tolerance, climate fit, space requirement,
              edibility, safety), Israeli hardiness zone matching, 14 user-preference tags, and real-time
              weather adjustments layered in at request time from OpenWeatherMap.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: "936", label: "Plant varieties", icon: <Database size={16} /> },
              { n: "69", label: "Features per plant", icon: <Layers size={16} /> },
              { n: "15", label: "Botanical clusters", icon: <Shuffle size={16} /> },
              { n: "2", label: "Live data sources", icon: <Sparkles size={16} /> },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 0.05}>
                <div className="rounded-2xl border border-black/[0.07] bg-[#F7F8F5] p-5 h-full">
                  <div className="text-[#2D5A3D] mb-3">{s.icon}</div>
                  <div className="font-[Sora] font-extrabold tracking-[-0.03em] leading-none mb-1.5"
                    style={{ fontSize: "28px" }}>{s.n}</div>
                  <div className="text-[12.5px] text-[#6B7280]">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* THE TWO MODELS */}
      <section className="px-6 py-24 ">
        <div className="max-w-[1000px] mx-auto">
          <Reveal>
            <Eyebrow>The two models</Eyebrow>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.03em] leading-[1.15] max-w-[600px] mb-10"
              style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>
              A neural network that scores, and a clustering model that gives it context.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-5">
            <Reveal delay={0.05}>
              <div className="rounded-2xl border border-black/[0.07] bg-white p-7 h-full">
                <div className="text-[10.5px] font-bold text-[#2D5A3D] tracking-[0.1em] uppercase font-[Sora] mb-3">
                  Model 1
                </div>
                <h3 className="font-[Sora] font-bold text-[#111811] mb-3" style={{ fontSize: "19px" }}>
                  Neural network matcher
                </h3>
                <p className="text-[13.5px] text-[#4B5563] leading-[1.7] mb-5">
                  A dense regression network trained on 46 raw plant attributes — hardiness, watering needs,
                  growth habit, safety flags, size — to predict a home-growing compatibility score. It runs
                  against every one of the 936 plants at request time, adjusted for your real-time local
                  weather.
                </p>
                <div className="rounded-xl bg-[#F7F8F5] p-4 mb-5 text-center">
                  <code className="text-[12px] text-[#4B5563] tracking-tight">46 → 256 → 128 → 64 → 32 → 1</code>
                  <div className="text-[10.5px] text-[#9CA3AF] mt-1.5">Dense + BatchNorm + Dropout · ReLU</div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[["MAE", "2.32"], ["RMSE", "2.93"], ["R²", "0.9624"]].map(([k, v]) => (
                    <div key={k}>
                      <div className="font-[Sora] font-extrabold text-[#111811]" style={{ fontSize: "18px" }}>{v}</div>
                      <div className="text-[10.5px] text-[#9CA3AF] uppercase tracking-[0.06em]">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-black/[0.07] bg-white p-7 h-full">
                <div className="text-[10.5px] font-bold text-[#6B48C8] tracking-[0.1em] uppercase font-[Sora] mb-3">
                  Model 2
                </div>
                <h3 className="font-[Sora] font-bold text-[#111811] mb-3" style={{ fontSize: "19px" }}>
                  KMeans botanical similarity
                </h3>
                <p className="text-[13.5px] text-[#4B5563] leading-[1.7] mb-5">
                  Groups all 936 plants into 15 clusters using 23 botanical similarity features, tuned with
                  WCSS and silhouette scoring. It doesn&apos;t score anything itself — it gives the neural
                  network&apos;s scores context, powering two features directly:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Shuffle size={14} className="mt-0.5 shrink-0" color="#6B48C8" />
                    <span className="text-[13px] text-[#4B5563]">
                      <strong className="text-[#111811]">Substitution engine</strong> — when a plant won&apos;t
                      survive, finds the closest match in the same cluster.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={14} className="mt-0.5 shrink-0" color="#6B48C8" />
                    <span className="text-[13px] text-[#4B5563]">
                      <strong className="text-[#111811]">Hidden gem detection</strong> — flags plants the
                      network scores highly that sit outside the expected cluster, exactly where the two
                      models disagree.
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* THE BUG */}
      <section className="px-6 py-24">
        <div className="max-w-[1000px] mx-auto">
          <Reveal>
            <Eyebrow color="#B23B3B">A mistake I caught</Eyebrow>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.03em] leading-[1.15] max-w-[640px] mb-10"
              style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>
              The first version of this model was cheating, and I almost didn&apos;t notice.
            </h2>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="rounded-2xl border border-black/[0.07] p-7 md:p-9 mb-8" style={{ background: "#FDF6F1" }}>
              <div className="flex items-start gap-3 mb-5">
                <Bug size={18} className="mt-0.5 shrink-0" color="#B23B3B" />
                <p className="text-[14.5px] text-[#4B5563] leading-[1.75]">
                  The target the model predicts, <code className="text-[13px] bg-white px-1.5 py-0.5 rounded border border-black/[0.06]">overall_home_score</code>,
                  is itself a fixed weighted sum of six other engineered scores. My first training run included
                  those six scores — plus four more flags that turned out to just be thresholded versions of
                  the same numbers — as <em>input</em> features. The network wasn&apos;t learning anything. It
                  was re-adding numbers I&apos;d already handed it, which is exactly why that version landed a
                  suspiciously perfect R² of 0.9879.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-white border border-black/[0.06] p-4">
                  <div className="text-[10.5px] font-bold text-[#B23B3B] uppercase tracking-[0.08em] mb-1.5">Before — leaked</div>
                  <div className="font-[Sora] font-extrabold text-[#111811]" style={{ fontSize: "24px" }}>0.9879</div>
                  <div className="text-[11.5px] text-[#9CA3AF] mt-1">10 leaking features included</div>
                </div>
                <div className="rounded-xl bg-white border border-black/[0.06] p-4">
                  <div className="text-[10.5px] font-bold text-[#2D5A3D] uppercase tracking-[0.08em] mb-1.5">After — honest</div>
                  <div className="font-[Sora] font-extrabold text-[#111811]" style={{ fontSize: "24px" }}>0.9624</div>
                  <div className="text-[11.5px] text-[#9CA3AF] mt-1">Learning the real relationship</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[#4B5563] leading-[1.75] max-w-[680px]" style={{ fontSize: "14.5px" }}>
              Once those ten features were removed from the inputs, the model had to actually learn the
              underlying, non-linear relationship between a plant&apos;s raw attributes and its home-growing
              suitability. The headline number dropped a little. Every metric on this site — R² 0.9624, MAE
              2.32 — is that honest result, not the inflated one.
            </p>
          </Reveal>
        </div>
      </section>

      {/* UNCERTAINTY */}
      <section className="px-6 py-24">
        <div className="max-w-[1000px] mx-auto">
          <Reveal>
            <Eyebrow>The confidence number</Eyebrow>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.03em] leading-[1.15] max-w-[640px] mb-10"
              style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>
              The ± next to your score comes from asking the model the same question 15 times.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 items-start">
            <Reveal delay={0.06}>
              <div className="rounded-2xl border border-black/[0.07] bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Dices size={16} color="#2D5A3D" />
                  <span className="text-[12px] font-bold text-[#111811] uppercase tracking-[0.06em]">MC Dropout, in short</span>
                </div>
                <ol className="space-y-3 text-[13px] text-[#4B5563] leading-[1.6]">
                  <li><strong className="text-[#111811]">1.</strong> Normally, Dropout layers switch off at inference — you get one clean pass.</li>
                  <li><strong className="text-[#111811]">2.</strong> MC Dropout leaves them stochastically active instead, and the network is run ~15 times on the same input.</li>
                  <li><strong className="text-[#111811]">3.</strong> BatchNorm layers still run in inference mode throughout — mixing that up would make every run meaningless at batch size 1.</li>
                  <li><strong className="text-[#111811]">4.</strong> The mean of those 15 runs is the score you see. The spread (standard deviation) becomes the ± number.</li>
                </ol>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div>
                <p className="text-[#4B5563] leading-[1.75] mb-5" style={{ fontSize: "14.5px" }}>
                  A tight spread means this plant, under these conditions, is a combination the model has
                  seen plenty like before — the ± number stays small. A wider spread just means it&apos;s a
                  less common combination in the training data, worth a quick gut-check alongside the score
                  rather than a reason to distrust it. On the results page this shows up as the small dot next
                  to a compact card, or the gauge icon with the full ± value on the expanded breakdown.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { text: "Consistent score", color: "#2D5A3D" },
                    { text: "Minor variation", color: "#B08900" },
                    { text: "Wider variation", color: "#B8722E" },
                  ].map(t => (
                    <span key={t.text} className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border"
                      style={{ color: t.color, borderColor: t.color + "40", background: t.color + "0D" }}>
                      <Gauge size={12} /> {t.text}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* EXPLAINABILITY */}
      <section className="px-6 py-24">
        <div className="max-w-[1000px] mx-auto">
          <Reveal>
            <Eyebrow color="#6B48C8">Why this score</Eyebrow>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.03em] leading-[1.15] max-w-[640px] mb-10"
              style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>
              Every score comes with the two or three factors that actually moved it.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-8 items-start">
            <Reveal delay={0.06}>
              <p className="text-[#4B5563] leading-[1.75] mb-5" style={{ fontSize: "14.5px" }}>
                This isn&apos;t SHAP — it&apos;s a lighter, dependency-free technique called gradient×input
                attribution. For a given plant, the model computes the gradient of the score with respect to
                each input feature, then multiplies that gradient by the feature&apos;s actual value. The
                result ranks how much each feature actually pushed <em>this specific</em> score up or down,
                not just how important that feature is on average across the whole dataset.
              </p>
              <p className="text-[#4B5563] leading-[1.75]" style={{ fontSize: "14.5px" }}>
                The top few factors by magnitude become the chips you see under &ldquo;Why this score&rdquo; —
                each one tagged as having pushed the score up or down.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="rounded-2xl border border-black/[0.07] bg-white p-6">
                <div className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-4">Example — basil, score 91</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Drought tolerance", dir: "up" },
                    { label: "Low maintenance", dir: "up" },
                    { label: "Indoor suitability", dir: "down" },
                  ].map(f => (
                    <span key={f.label}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-full border border-black/[0.07] bg-[#F7F8F5]">
                      {f.dir === "up"
                        ? <ArrowUp size={12} color="#2D5A3D" />
                        : <ArrowDown size={12} color="#B23B3B" />}
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-28">
        <Reveal>
          <div className="max-w-[1000px] mx-auto rounded-[28px] p-10 md:p-14 text-center">
            <h2 className="font-[Sora] font-extrabold text-black tracking-[-0.03em] leading-[1.15] mb-4"
              style={{ fontSize: "clamp(22px, 3vw, 30px)" }}>
              See it work on your own space.
            </h2>
            <p className="text-black/55 mb-8 max-w-[440px] mx-auto" style={{ fontSize: "14.5px" }}>
              Under 2 minutes, three questions, and a live analysis against your exact conditions.
            </p>
            <Link href="/analyse"
              className="inline-flex items-center gap-2 bg-[#284a28] text-white px-7 py-3 rounded-full font-semibold text-[14.5px] hover:-translate-y-px transition-all">
              Analyse my space <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

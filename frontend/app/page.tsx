"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Sparkles, Save, Shuffle, Columns, Sprout, Apple, PawPrint, Droplets } from "lucide-react";



// ─── Motion helpers ────────────────────────────────────────────────────────────

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({
  children, className, delay = 0, x = 0, y = 24,
}: {
  children: ReactNode; className?: string; delay?: number; x?: number; y?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, x, y }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.72, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const staggerItem = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

function StaggerReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  return (
    <motion.div ref={ref} className={className}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  );
}


const STEPS = [
  {
    n: "01",
    title: "Tell us about your space",
    body: "Location, available light, space type, experience level. Under two minutes.",
  },
  {
    n: "02",
    title: "The model scores every plant",
    body: "A neural network evaluates all 936 plants against your exact conditions — climate zone, sunlight, space, and preferences — adjusted for real-time weather.",
  },
  {
    n: "03",
    title: "You get a precise, explained analysis",
    body: "A ranked list with full compatibility breakdowns, smart substitutions when a plant won't survive, and hidden gems the model flagged as unexpectedly strong fits.",
  },
];

const DIFFERENTIATORS = [
  {
    label: "Climate-specific",
    body: "Calibrated for Israel's hardiness zones — Tel Aviv coast, Jerusalem hills, Galilee, Negev. Not advice written for Northern Europe.",
  },
  {
    label: "Hidden gem detection",
    body: "The model surfaces plants that score unexpectedly high for your conditions but sit outside your typical zone profile. Plants most people never find.",
  },
  {
    label: "Botanical substitution",
    body: "When a plant won't survive your conditions, the engine finds the closest match in the same botanical cluster — same aesthetic, better odds.",
  },
  {
    label: "Nothing is a black box",
    body: "Every compatibility score comes with a full breakdown: climate fit, space score, beginner ease, pet safety, drought tolerance. You see the numbers.",
  },
];

const PERSONAS = [
  {
    label: "Never kept a plant alive",
    icon: Sprout,
    body: "The model weighs beginner-friendliness into every score, so your first pick isn't something that needed a green thumb you don't have yet.",
  },
  {
    label: "Growing your own food",
    icon: Apple,
    body: "Filter for edible plants and every score adjusts for what's actually worth eating from your specific balcony or windowsill.",
  },
  {
    label: "Sharing space with pets or kids",
    icon: PawPrint,
    body: "Pet and child safety are checked before a plant ever reaches your results — not a warning you find out after buying it.",
  },
  {
    label: "Low water, low fuss",
    icon: Droplets,
    body: "Living somewhere hot and dry, or just don't want a demanding routine? Drought tolerance gets weighted into your match from the start.",
  },
];

const HERO_PLANT = {
  name: "Blue Sansevieria",
  type: "Succulent",
  score: 88,
  tags: ["Pet safe", "Low water", "Indoor"],
};

// Main 

export default function LandingPage() {
  const [scrolled, setScrolled]       = useState(false);
  const [mobileMenuOpen, setMobileOpen] = useState(false);
  const [activePersona, setActivePersona] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  return (
    <>
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html  { scroll-behavior: smooth; }
        body  { font-family: 'DM Sans', sans-serif; background: #F7F8F5; color: #111811; overflow-x: hidden; margin: 0; }

        @keyframes subtlePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }

        .pulse { animation: subtlePulse 2.4s ease-in-out infinite; }

        .gradient-text {
          background: linear-gradient(130deg, #2D5A3D 0%, #5A9A6A 50%, #C8845A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .newsletter-input {
          flex: 1;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 100px;
          padding: 10px 16px;
          font-size: 13px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .newsletter-input::placeholder { color: rgba(255,255,255,0.3); }
        .newsletter-input:focus { border-color: rgba(90,154,106,0.5); }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[1040px]">
        <div className={`rounded-[28px] border transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-black/[0.07] shadow-[0_10px_34px_rgba(17,24,17,0.10)]"
            : "bg-white/75 backdrop-blur-md border-black/[0.05] shadow-[0_6px_22px_rgba(17,24,17,0.06)]"
        }`}>
          <div className="h-14 flex items-center justify-between px-5">
            <Link href="/" className="shrink-0">
              <Image src="/plearnlogo.png" alt="Plearn" width={96} height={21} />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <button onClick={() => scrollTo("how-it-works")} className="text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-3.5 py-2 rounded-full transition-colors">
                How it works
              </button>
              <Link href="/catalog" className="text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-3.5 py-2 rounded-full transition-colors">
                Plant catalog
              </Link>
              <Link href="/methodology" className="text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-3.5 py-2 rounded-full transition-colors">
                How it thinks
              </Link>
            </div>

            <Link href="/analyse" className="bg-[#2D5A3D] text-white px-5 py-2 rounded-full text-[13px] font-semibold hover:bg-[#244930] transition-all hover:-translate-y-px hidden md:block shrink-0">
              Get started
            </Link>

            <button className="md:hidden p-2 flex flex-col gap-[5px]" onClick={() => setMobileOpen(!mobileMenuOpen)}>
              <span className={`block w-5 h-[1.5px] bg-[#111811] transition-all origin-center ${mobileMenuOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
              <span className={`block w-5 h-[1.5px] bg-[#111811] transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-[1.5px] bg-[#111811] transition-all origin-center ${mobileMenuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="md:hidden mt-2 rounded-[24px] border border-black/[0.06] bg-white/95 backdrop-blur-xl shadow-[0_10px_34px_rgba(17,24,17,0.10)] py-5 px-6 flex flex-col gap-4"
            >
              <button onClick={() => scrollTo("how-it-works")} className="text-left text-[14px] text-[#4B5563]">How it works</button>
              <button onClick={() => scrollTo("about")} className="text-left text-[14px] text-[#4B5563]">About</button>
              <Link href="/catalog" className="text-left text-[14px] text-[#4B5563]">Plant catalog</Link>
              <Link href="/methodology" className="text-left text-[14px] text-[#4B5563]">How it thinks</Link>
              <Link href="/analyse" className="bg-[#2D5A3D] text-white px-5 py-2.5 rounded-full text-[13.5px] font-semibold text-center">Get started</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden min-h-screen flex items-center pt-32 pb-20 px-6">

        <div className="relative z-10 w-full max-w-[1180px] mx-auto grid md:grid-cols-2 gap-14 md:gap-20 items-center">

          {/* Left — text */}
          <div className="text-left">

            {/* Single badge — restrained */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold text-[#2D5A3D] tracking-[0.05em] uppercase font-[Sora]">
                <span className="pulse w-1.5 h-1.5 rounded-full bg-[#2D5A3D] inline-block" />
                Agricultural AI for Israel
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="font-[Sora] font-extrabold leading-[1.04] tracking-[-0.04em] mb-6"
              style={{ fontSize: "clamp(38px, 5.5vw, 68px)" }}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease, delay: 0.08 }}
            >
              The right plant,<br />
              <span className="text-[#2D5A3D]">for your exact conditions.</span>
            </motion.h1>

            {/* Subline — one sentence, specific */}
            <motion.p
              className="text-[#4B5563] leading-[1.7] max-w-[440px] mb-10"
              style={{ fontSize: "clamp(16px, 1.9vw, 18.5px)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease, delay: 0.18 }}
            >
              Plearn scores 936 plant varieties against your exact location, light, and climate zone — live. Built specifically for Israeli home growers.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex items-center gap-4 flex-wrap"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.26 }}
            >
              <Link href="/analyse"
                className="bg-[#2D5A3D] text-white px-8 py-3.5 rounded-full font-semibold text-[15px] hover:bg-[#244930] hover:-translate-y-px hover:shadow-[0_12px_32px_rgba(45,90,61,0.28)] transition-all"
              >
                Analyse my space →
              </Link>
              <button onClick={() => scrollTo("how-it-works")}
                className="text-[#4B5563] text-[15px] font-medium hover:text-[#111811] transition-colors"
              >
                How it works ↓
              </button>
            </motion.div>
          </div>

          {/* Right — a single, quiet proof point instead of a busy fake screenshot */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.3 }}
          >
            {/* soft ambient glow — depth without motion or noise */}
            <div className="absolute -inset-10 rounded-[48px] opacity-70 pointer-events-none"
              style={{ background: "radial-gradient(closest-side, rgba(45,90,61,0.10), transparent 75%)" }} />

            <motion.div
              className="relative"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            >
              <div className="bg-white rounded-[28px] border border-black/[0.07] shadow-[0_40px_90px_rgba(17,24,17,0.09)] p-8 md:p-10 text-left">
                <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#9CA3AF] font-[Sora] mb-5">
                  Top match · Tel Aviv balcony
                </div>

                <div className="font-[Sora] text-[21px] font-bold text-[#111811] tracking-[-0.01em] mb-1">
                  {HERO_PLANT.name}
                </div>
                <div className="text-[13px] text-[#6B7280] mb-8">
                  {HERO_PLANT.type} · {HERO_PLANT.tags.join(" · ")}
                </div>

                <div className="flex items-baseline gap-2.5">
                  <span className="font-[Sora] font-extrabold tracking-[-0.05em] leading-none text-[#2D5A3D]"
                    style={{ fontSize: "clamp(64px, 7vw, 92px)" }}>
                    {HERO_PLANT.score}
                  </span>
                  <span className="text-[14px] text-[#9CA3AF] mb-1">/ 100 compatibility</span>
                </div>

                <div className="mt-8 pt-6 border-t border-[#F0F2EE] flex items-center gap-2">
                  <Sparkles size={15} color="#6B48C8" />
                  <span className="text-[13px] font-semibold text-[#6B48C8]">
                    Plus 2 hidden gems found for this space
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/*NUMBERS */}
      <Reveal>
        <div className="border-y border-black/[0.06] bg-none">
          <div className="max-w-[1100px] mx-auto px-6 py-12 md:py-14">
            <StaggerReveal className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-black/[0.06]">
              {[
                { n: "936",   label: "Plant varieties", note: "across 15 climate clusters" },
                { n: "69",    label: "Features per plant", note: "engineered from raw data" },
                { n: "R² 0.9624", label: "Model accuracy", note: "on held-out test data" },
                { n: "< 2 min", label: "Onboarding time", note: "to a complete analysis" },
              ].map(stat => (
                <motion.div key={stat.label} variants={staggerItem} className="md:px-10 first:md:pl-0 last:md:pr-0">
                  <div className="font-[Sora] font-extrabold tracking-[-0.04em] leading-none mb-1.5 text-[#111811]"
                    style={{ fontSize: "clamp(26px, 3.5vw, 40px)" }}>
                    {stat.n}
                  </div>
                  <div className="text-[13px] font-semibold text-[#111811] mb-0.5">{stat.label}</div>
                  <div className="text-[12px] text-[#9CA3AF]">{stat.note}</div>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </div>
      </Reveal>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-28 md:py-36 px-6 bg-[#F7F8F5]">
        <div className="max-w-[1100px] mx-auto">

          <Reveal className="mb-16 md:mb-20">
            <p className="text-[11.5px] font-bold text-[#2D5A3D] tracking-[0.1em] uppercase font-[Sora] mb-4">How it works</p>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.04em] leading-[1.1] max-w-[560px]"
              style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}>
              Three questions.<br />One precise analysis.
            </h2>
          </Reveal>

          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08}>
                <div className={`flex gap-8 md:gap-16 py-10 md:py-12 ${
                  i < STEPS.length - 1 ? "border-b border-black/[0.06]" : ""
                }`}>
                  <div className="font-[Sora] text-[13px] font-bold text-[#CBD5C0] w-8 pt-1 shrink-0">{step.n}</div>
                  <div className="flex-1 grid md:grid-cols-2 gap-4 md:gap-16">
                    <h3 className="font-[Sora] font-bold tracking-[-0.02em] leading-[1.3]"
                      style={{ fontSize: "clamp(18px, 2vw, 22px)" }}>
                      {step.title}
                    </h3>
                    <p className="text-[15.5px] text-[#4B5563] leading-[1.75]">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12" delay={0.1}>
            <Link href="/analyse"
              className="inline-flex items-center gap-2 bg-[#2D5A3D] text-white px-8 py-3.5 rounded-full font-semibold text-[15px] hover:bg-[#244930] hover:-translate-y-px transition-all"
            >
              Start your analysis →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* SAVED ANALYSIS + DIVERSE SET */}
      <section className="py-28 md:py-36 px-6 bg-none">
        <div className="max-w-[1100px] mx-auto">
          <Reveal className="mb-16 md:mb-20">
            <p className="text-[11.5px] font-bold text-[#2D5A3D] tracking-[0.1em] uppercase font-[Sora] mb-4">Your results</p>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.04em] leading-[1.1] max-w-[620px]"
              style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}>
              Stays exactly where you left it — until you run a new one.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-px bg-[#F0F2EE] rounded-[20px] overflow-hidden">
            {[
              {
                label: "Saved for your session",
                body: "Browse the catalogue, compare plants, edit your conditions — your ranked results stay exactly where you left them until you start a new analysis.",
                color: "#2D5A3D",
                icon: Save,
              },
              {
                label: "Hidden gems",
                body: "Plants that scored unexpectedly high for your conditions but sit outside your typical zone cluster. The anomaly detection layer surfaced what standard advice would never recommend.",
                color: "#6B48C8",
                icon: Sparkles,
              },
              {
                label: "Diverse set",
                body: "The strongest plant from each distinct botanical cluster in your results — not just the top scores overall, which tend to bunch up in one family. A real spread for a starter garden.",
                color: "#C87B4A",
                icon: Shuffle,
              },
              {
                label: "Compare up to 3 plants",
                body: "Select any three plants from your results and compare them side by side — compatibility scores, care requirements, climate fit, pet safety, and drought tolerance. Pick what actually fits your life, not just your zone.",
                color: "#2D5A3D",
                icon: Columns,
              },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.06}>
                <div className="bg-white p-8 md:p-10 h-full">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: item.color + "14" }}>
                    <item.icon size={18} color={item.color} />
                  </div>
                  <div className="text-[11.5px] font-bold tracking-[0.06em] uppercase font-[Sora] mb-3" style={{ color: item.color }}>
                    {item.label}
                  </div>
                  <p className="text-[15px] text-[#4B5563] leading-[1.75]">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MODEL PERFORMANCE */}
      <section className="bg-[#0F1A0F] py-28 md:py-36 px-6 overflow-hidden relative rounded-4xl">
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #3A7A50, transparent)" }} />

        <div className="relative max-w-[1100px] mx-auto">

          <Reveal>
            <p className="text-[11.5px] font-bold text-[#5A9A6A] tracking-[0.1em] uppercase font-[Sora] mb-6">Performance</p>
            <h2 className="font-[Sora] font-extrabold text-white tracking-[-0.04em] leading-[1.1] max-w-[560px] mb-6"
              style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}>
              A model accurate enough to trust.
            </h2>
            <p className="text-[#8A9E8A] text-[16px] leading-[1.75] max-w-[540px] mb-16">
              When Plearn scores a plant at 85, it means something. A dense regression neural network trained on 46 raw plant attributes, adjusted for real-time weather at inference time.
            </p>
          </Reveal>

          <StaggerReveal className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-[20px] overflow-hidden">
            {[
              { n: "R² 0.9624", label: "Accuracy", note: "On held-out test data" },
              { n: "2.32",      label: "Mean absolute error", note: "On a 0–100 compatibility scale" },
              { n: "3.3%",      label: "Error rate",          note: "Across all 936 plant varieties" },
            ].map(m => (
              <motion.div key={m.label} variants={staggerItem}
                className="bg-[#0F1A0F] px-8 py-10"
              >
                <div className="font-[Sora] font-extrabold text-white tracking-[-0.04em] mb-2"
                  style={{ fontSize: "clamp(30px, 3vw, 44px)" }}>
                  {m.n}
                </div>
                <div className="text-[13px] font-semibold text-[#5A9A6A] mb-1">{m.label}</div>
                <div className="text-[12px] text-[#4A5E4A]">{m.note}</div>
              </motion.div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* WHAT MAKES IT DIFFERENT */}
      <section className="py-28 md:py-36 px-6 bg-none">
        <div className="max-w-[1100px] mx-auto">

          <Reveal className="mb-16 md:mb-20">
            <p className="text-[11.5px] font-bold text-[#2D5A3D] tracking-[0.1em] uppercase font-[Sora] mb-4">What makes it different</p>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.04em] leading-[1.1]"
              style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}>
              Built for Israel, not<br />somewhere else.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-px bg-[#F0F2EE] rounded-[20px] overflow-hidden">
            {DIFFERENTIATORS.map((d, i) => (
              <Reveal key={d.label} delay={i * 0.06}>
                <div className="bg-white p-8 md:p-10 h-full">
                  <div className="text-[11.5px] font-bold text-[#2D5A3D] tracking-[0.04em] uppercase font-[Sora] mb-3">{d.label}</div>
                  <p className="text-[15.5px] text-[#4B5563] leading-[1.75]">{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12" delay={0.1}>
            <Link href="/analyse"
              className="inline-flex items-center gap-2 bg-[#2D5A3D] text-white px-8 py-3.5 rounded-full font-semibold text-[15px] hover:bg-[#244930] hover:-translate-y-px transition-all"
            >
              Analyse my conditions →
            </Link>
          </Reveal>
        </div>
      </section>

            {/*WHO IT'S FOR */}
      <section className="py-28 md:py-36 px-6 bg-none">
        <div className="max-w-[820px] mx-auto text-center">

          <Reveal>
            <p className="text-[11.5px] font-bold text-[#2D5A3D] tracking-[0.1em] uppercase font-[Sora] mb-4">Who it&apos;s for</p>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.04em] leading-[1.1] mb-12"
              style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}>
              Whatever kind of grower you are.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-wrap justify-center gap-2.5 mb-4">
              {PERSONAS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setActivePersona(i)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition-all"
                  style={activePersona === i
                    ? { background: "#2D5A3D", color: "white" }
                    : { background: "white", color: "#4B5563", border: "1px solid #E4E7E1" }}
                >
                  <p.icon size={14} />
                  {p.label}
                </button>
              ))}
            </div>
          </Reveal>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePersona}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease }}
              className="mt-8 rounded-[28px] border border-black/[0.07] bg-white p-10 md:p-14"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "#EEF7F1" }}>
                {(() => { const Icon = PERSONAS[activePersona].icon; return <Icon size={24} color="#2D5A3D" />; })()}
              </div>
              <p className="text-[#111811] leading-[1.75] max-w-[520px] mx-auto" style={{ fontSize: "clamp(16px, 2vw, 19px)" }}>
                {PERSONAS[activePersona].body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/*PLANT CATALOGUE */}
      <section className="py-28 md:py-36 px-6 bg-none">
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-center">

          <Reveal>
            <p className="text-[11.5px] font-bold text-[#2D5A3D] tracking-[0.1em] uppercase font-[Sora] mb-4">Plant Catalogue</p>
            <h2 className="font-[Sora] font-extrabold tracking-[-0.04em] leading-[1.1] mb-6"
              style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}>
              Browse freely.<br />
              <span className="text-[#2D5A3D]">Score personally.</span>
            </h2>
            <p className="text-[16px] text-[#4B5563] leading-[1.75] mb-10 max-w-[420px]">
              The full catalogue is open to everyone — botanical profiles, care guides, climate data. Run an analysis and every plant gets a compatibility score for your exact space.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/catalog"
                className="border border-[#2D5A3D] text-[#2D5A3D] px-7 py-3 rounded-full font-semibold text-[14px] hover:bg-[#2D5A3D] hover:text-white transition-all"
              >
                Browse the catalogue →
              </Link>
              <Link href="/analyse"
                className="bg-[#2D5A3D] text-white px-7 py-3 rounded-full font-semibold text-[14px] hover:bg-[#244930] hover:-translate-y-px transition-all"
              >
                Get my rankings →
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="bg-white rounded-[24px] border border-black/[0.07] shadow-[0_16px_40px_rgba(17,24,17,0.05)] overflow-hidden">
              {/* Generic — no analysis */}
              <div className="p-6 border-b border-[#F0F2EE]">
                <div className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#9CA3AF] font-[Sora] mb-3">Without analysis</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-[Sora] font-bold text-[16px] text-[#111811] mb-0.5">Bird of Paradise</div>
                    <div className="text-[12px] text-[#9CA3AF]">Tropical · Full sun</div>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-[#F0F2EE] flex items-center justify-center">
                    <span className="font-[Sora] font-extrabold text-[#CBD5C0] text-[18px]">—</span>
                  </div>
                </div>
              </div>

              {/* Personalised — after analysis */}
              <div className="p-6 bg-[#F7FBF8]">
                <div className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#2D5A3D] font-[Sora] mb-3">After your analysis · Tel Aviv balcony</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-[Sora] font-bold text-[16px] text-[#111811] mb-0.5">Bird of Paradise</div>
                    <div className="text-[12px] text-[#4B5563]">Tropical · Full sun · Pet unsafe</div>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-[#2D5A3D] flex items-center justify-center shadow-[0_4px_16px_rgba(45,90,61,0.3)]">
                    <span className="font-[Sora] font-extrabold text-white text-[18px]">89</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {["Climate ✓", "Space ✓", "Drought ✓"].map(tag => (
                    <span key={tag} className="text-[11px] font-semibold text-[#2D5A3D] bg-[#2D5A3D]/[0.08] px-2.5 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      </section>



      {/* CTA */}
      <section className="py-28 md:py-36 px-6 bg-none">
        <Reveal className="max-w-[760px] mx-auto text-center">
          <h2 className="font-[Sora] font-extrabold tracking-[-0.04em] leading-[1.08] mb-5"
            style={{ fontSize: "clamp(30px, 5vw, 58px)" }}>
            Find out what will actually<br />grow in your space.
          </h2>
          <p className="text-[16px] text-[#4B5563] leading-[1.7] max-w-[440px] mx-auto mb-10">
            Tell us where you live and how your space looks. The analysis is under two minutes.
          </p>
          <Link href="/analyse"
            className="inline-block bg-[#2D5A3D] text-white px-10 py-4 rounded-full font-bold text-[15.5px] hover:bg-[#244930] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(45,90,61,0.28)] transition-all"
          >
            Analyse my space — it&apos;s free →
          </Link>
        </Reveal>
      </section>

      {/* FOOTER */}
<footer id="about" className="bg-none text-[#0F1A0F] px-6 py-14">
  <div className="max-w-[1100px] mx-auto">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-[#0F1A0F]/[0.08]">
      <Link href="/" className="flex items-center gap-3 shrink-0">
        <Image src="/plearnlogo.png" alt="Plearn" width={100} height={22} />
      </Link>

      <nav className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <button
          onClick={() => scrollTo("how-it-works")}
          className="text-[13.5px] text-[#0F1A0F]/60 hover:text-[#2D5A3D] transition-colors"
        >
          How it works
        </button>
        <Link href="/methodology" className="text-[13.5px] text-[#0F1A0F]/60 hover:text-[#2D5A3D] transition-colors">
          How it thinks
        </Link>
        <Link href="/catalog" className="text-[13.5px] text-[#0F1A0F]/60 hover:text-[#2D5A3D] transition-colors">
          Plant catalog
        </Link>
        <Link href="/analyse" className="text-[13.5px] text-[#0F1A0F]/60 hover:text-[#2D5A3D] transition-colors">
          Get started
        </Link>
      </nav>
    </div>

    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span className="text-[12px] text-[#0F1A0F]/40">
        © 2026 Plearn. Agricultural AI for home growers in Israel.
      </span>
    </div>
  </div>
</footer>
    </>
  );
}

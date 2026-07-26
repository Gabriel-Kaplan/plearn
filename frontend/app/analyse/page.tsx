"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Thermometer,
  Sun, CloudSun, Cloud,
  Building2, Trees, AppWindow, Home,
  Sprout, Leaf, TreePine,
  Salad, PawPrint, Droplet, Timer,
  type LucideIcon,
} from "lucide-react";
import type { UserConditions } from "@/lib/types";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CITIES = [
  "Acre", "Afula", "Arad", "Ashdod", "Ashkelon",
  "Bat Yam", "Be'er Sheva", "Be'er Ya'akov", "Beit Shean", "Beit Shemesh",
  "Binyamina", "Bnei Brak",
  "Caesarea",
  "Dimona",
  "Eilat", "El'ad", "Even Yehuda",
  "Gedera", "Giv'atayim", "Giv'at Shmuel",
  "Hadera", "Haifa", "Harish", "Herzliya", "Hod HaSharon", "Holon",
  "Jerusalem",
  "Karmiel", "Kfar Saba", "Kfar Vradim", "Kfar Yona",
  "Kiryat Ata", "Kiryat Bialik", "Kiryat Gat", "Kiryat Malakhi",
  "Kiryat Motzkin", "Kiryat Ono", "Kiryat Shmona", "Kiryat Tivon", "Kiryat Yam",
  "Kochav Ya'ir",
  "Lod",
  "Ma'alot-Tarshiha", "Metula", "Mevaseret Zion", "Migdal HaEmek",
  "Mitzpe Ramon", "Modi'in-Maccabim-Re'ut",
  "Nahariya", "Nazareth", "Nesher", "Ness Ziona", "Netanya", "Netivot",
  "Nof HaGalil",
  "Ofakim", "Omer", "Or Akiva", "Or Yehuda",
  "Pardes Hanna-Karkur", "Petah Tikva",
  "Ra'anana", "Rahat", "Ramat Gan", "Ramat HaSharon", "Ramla", "Rehovot",
  "Rishon LeZion", "Rosh HaAyin", "Rosh Pinna",
  "Safed", "Savyon", "Sderot", "Shefa-Amr",
  "Tel Aviv", "Tiberias", "Tira", "Tirat Carmel",
  "Yavne", "Yehud-Monosson", "Yokneam Illit",
  "Zichron Ya'akov",
];

type Light      = UserConditions["light"];
type Space      = UserConditions["space"];
type Experience = UserConditions["experience"];
type PrefKey    = "edible" | "pet_safe" | "drought_resistant" | "low_maintenance";

const LIGHT_OPTIONS = [
  { value: "full_sun"      as Light, label: "Full sun",      desc: "6+ hours of direct sunlight daily",     icon: Sun },
  { value: "partial_shade" as Light, label: "Partial shade", desc: "3–6 hours, some direct sun",             icon: CloudSun },
  { value: "full_shade"    as Light, label: "Full shade",    desc: "Under 3 hours, mostly indirect light",   icon: Cloud },
];

const SPACE_OPTIONS = [
  { value: "balcony"    as Space, label: "Balcony",    desc: "Outdoor pots and containers",    icon: Building2 },
  { value: "garden"     as Space, label: "Garden",     desc: "Ground planting, open space",    icon: Trees },
  { value: "windowsill" as Space, label: "Windowsill", desc: "Small indoor ledge",             icon: AppWindow },
  { value: "indoor"     as Space, label: "Indoor",     desc: "Inside, no direct outdoor sun",  icon: Home },
];

const EXP_OPTIONS = [
  { value: "beginner"     as Experience, label: "Beginner",     desc: "Just starting out — maybe killed a plant or two.", icon: Sprout },
  { value: "intermediate" as Experience, label: "Intermediate", desc: "A few wins under my belt. Ready for more.",          icon: Leaf },
  { value: "expert"       as Experience, label: "Expert",       desc: "I know what a hardiness zone is.",                   icon: TreePine },
];

const PREF_OPTIONS = [
  { key: "edible"            as PrefKey, label: "Edible",          desc: "Herbs, vegetables, fruit",       icon: Salad },
  { key: "pet_safe"          as PrefKey, label: "Pet safe",        desc: "Non-toxic to cats and dogs",     icon: PawPrint },
  { key: "drought_resistant" as PrefKey, label: "Drought hardy",   desc: "Survives dry, hot conditions",   icon: Droplet },
  { key: "low_maintenance"   as PrefKey, label: "Low maintenance", desc: "Minimal care required",          icon: Timer },
];

const STEP_META = [
  { short: "Location",    detail: "Determines your climate zone and live weather data" },
  { short: "Sunlight",    detail: "The strongest predictor in the model" },
  { short: "Space type",  detail: "Affects which plant sizes and types can work" },
  { short: "Experience",  detail: "Re-weights recommendations for your skill level" },
  { short: "Preferences", detail: "Optional — filters and boosts your results" },
];

const TOTAL = 5;
const ease  = [0.4, 0, 0.2, 1] as const;

const stepVariants = {
  enter:  (d: number) => ({ x: d * 24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d * -24, opacity: 0 }),
};

// ─── Option card ──────────────────────────────────────────────────────────────

function OptionCard({
  selected, onClick, icon: Icon, label, desc, toggle = false,
}: {
  selected: boolean; onClick: () => void;
  icon: LucideIcon; label: string; desc: string; toggle?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={!selected ? { y: -1 } : {}}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-200 ${
        selected
          ? "border-[#2D5A3D] bg-[#EEF7F1] shadow-[0_0_0_1px_#2D5A3D]"
          : "border-[#E4E7E1] bg-white hover:border-[#2D5A3D]/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          selected ? "bg-[#D5EBD9] text-[#2D5A3D]" : "bg-[#F7F8F5] text-[#6B7280]"
        }`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] font-semibold font-[Sora] leading-tight ${selected ? "text-[#2D5A3D]" : "text-[#111811]"}`}>
            {label}
          </div>
          <div className="text-[12.5px] text-[#6B7280] mt-0.5">{desc}</div>
        </div>
        <div className={`shrink-0 transition-all duration-200 ${toggle ? "w-9" : ""}`}>
          {toggle ? (
            <div className={`w-9 h-5 rounded-full relative transition-colors ${selected ? "bg-[#2D5A3D]" : "bg-[#D1D5DB]"}`}>
              <motion.div
                animate={{ x: selected ? 16 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm"
              />
            </div>
          ) : (
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  className="w-5 h-5 rounded-full bg-[#2D5A3D] flex items-center justify-center"
                >
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalysePage() {
  const router = useRouter();

  const [step, setStep]       = useState(0);
  const [direction, setDir]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [city, setCity]             = useState("");
  const [cityQuery, setCityQuery]   = useState("");
  const [light, setLight]           = useState<Light | null>(null);
  const [space, setSpace]           = useState<Space | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    edible: false, pet_safe: false, drought_resistant: false, low_maintenance: false,
  });

  const filteredCities = CITIES.filter(c => c.toLowerCase().includes(cityQuery.toLowerCase()));

  function canAdvance() {
    if (step === 0) return city !== "";
    if (step === 1) return light !== null;
    if (step === 2) return space !== null;
    if (step === 3) return experience !== null;
    return true;
  }

  function goForward() { setDir(1);  setStep(s => s + 1); }
  function goBack()    { setDir(-1); setStep(s => s - 1); }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const payload: UserConditions = {
      city, light: light!, space: space!, experience: experience!,
      preferences: {
        edible: prefs.edible, pet_safe: prefs.pet_safe,
        drought_resistant: prefs.drought_resistant, low_maintenance: prefs.low_maintenance,
      },
    };
    try {
      const res = await fetch("/api/recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Analysis failed. Make sure the backend is running.");
      const data = await res.json();
      sessionStorage.setItem("plearn_results", JSON.stringify(data));
      sessionStorage.setItem("plearn_conditions", JSON.stringify(payload));
      router.push("/results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  // ─── Step screens ──────────────────────────────────────────────────────────

  const steps = [

    // 0 — Location
    <div key="location">
      <h2 className="font-[Sora] font-bold tracking-[-0.03em] leading-tight mb-2 text-gray-900" style={{ fontSize: "clamp(22px,3vw,28px)" }}>
        Where are you growing?
      </h2>
      <p className="text-[14px] text-[#6B7280] mb-6">Your city determines your climate zone and live weather data.</p>

      <div className="relative mb-3">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search for your city..."
          value={cityQuery}
          onChange={e => { setCityQuery(e.target.value); setCity(""); }}
          className="w-full pl-10 pr-4 py-3.5 rounded-2xl border-2 border-[#E4E7E1] text-gray-500 focus:border-[#2D5A3D] outline-none text-[14.5px] bg-white transition-colors"
        />
      </div>

      <AnimatePresence mode="wait">
        {city ? (
          <motion.div
            key="selected"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-3 px-4 py-3 bg-[#EEF7F1] rounded-2xl border-2 border-[#2D5A3D]/30"
          >
            <div className="w-7 h-7 rounded-full bg-[#2D5A3D] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[14px] font-semibold text-[#2D5A3D] flex-1">{city}</span>
            <button onClick={() => { setCity(""); setCityQuery(""); }}
              className="text-[12.5px] text-[#6B7280] hover:text-[#111811] transition-colors font-medium">
              Change
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto"
          >
            {filteredCities.map(c => (
              <motion.button
                key={c}
                onClick={() => { setCity(c); setCityQuery(c); }}
                whileTap={{ scale: 0.96 }}
                className="text-left px-4 py-2.5 rounded-xl text-[13.5px] font-medium border-2 border-[#E4E7E1] bg-white hover:border-[#2D5A3D]/40 hover:bg-[#F7FAF7] text-[#374151] transition-all"
              >
                {c}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,

    // 1 — Light
    <div key="light">
      <h2 className="font-[Sora] font-bold tracking-[-0.03em] leading-tight mb-2 text-gray-900" style={{ fontSize: "clamp(22px,3vw,28px)" }}>
        How much sun does your space get?
      </h2>
      <p className="text-[14px] text-[#6B7280] mb-6">This is one of the strongest predictors in the model.</p>
      <div className="space-y-2.5">
        {LIGHT_OPTIONS.map(o => (
          <OptionCard key={o.value} selected={light === o.value} onClick={() => setLight(o.value)}
            icon={o.icon} label={o.label} desc={o.desc} />
        ))}
      </div>
    </div>,

    // 2 — Space
    <div key="space">
      <h2 className="font-[Sora] font-bold tracking-[-0.03em] leading-tight mb-2 text-gray-900" style={{ fontSize: "clamp(22px,3vw,28px)" }}>
        What kind of space are you working with?
      </h2>
      <p className="text-[14px] text-[#6B7280] mb-6">Affects which plant types and sizes can grow there.</p>
      <div className="grid grid-cols-2 gap-2.5">
        {SPACE_OPTIONS.map(o => (
          <OptionCard key={o.value} selected={space === o.value} onClick={() => setSpace(o.value)}
            icon={o.icon} label={o.label} desc={o.desc} />
        ))}
      </div>
    </div>,

    // 3 — Experience
    <div key="experience">
      <h2 className="font-[Sora] font-bold tracking-[-0.03em] leading-tight mb-2 text-gray-900" style={{ fontSize: "clamp(22px,3vw,28px)" }}>
        How experienced are you with plants?
      </h2>
      <p className="text-[14px] text-[#6B7280] mb-6">The model re-weights recommendations for your skill level.</p>
      <div className="space-y-2.5">
        {EXP_OPTIONS.map(o => (
          <OptionCard key={o.value} selected={experience === o.value} onClick={() => setExperience(o.value)}
            icon={o.icon} label={o.label} desc={o.desc} />
        ))}
      </div>
    </div>,

    // 4 — Preferences
    <div key="prefs">
      <h2 className="font-[Sora] font-bold tracking-[-0.03em] leading-tight mb-2 text-gray-900" style={{ fontSize: "clamp(22px,3vw,28px)" }}>
        Any must-haves or deal-breakers?
      </h2>
      <p className="text-[14px] text-[#6B7280] mb-6">Optional — these filter and re-weight your results.</p>
      <div className="space-y-2.5">
        {PREF_OPTIONS.map(o => (
          <OptionCard key={o.key} selected={prefs[o.key]}
            onClick={() => setPrefs(p => ({ ...p, [o.key]: !p[o.key] }))}
            icon={o.icon} label={o.label} desc={o.desc} toggle />
        ))}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; margin: 0; overflow: hidden; }
        @media (max-width: 767px) { body { overflow: auto; } }
      `}</style>

      <div className="flex h-screen bg-white overflow-hidden">

        {/* ── LEFT SIDEBAR (desktop) ────────────────────────────────── */}
        <div className="hidden md:flex flex-col w-72 shrink-0 bg-[#0F1A0F] h-full">

          {/* Logo */}
          <div className="px-8 pt-8 pb-0">
            <Link href="/">
              <Image src="/plearnlogo.png" alt="Plearn" width={96} height={22}
                style={{ filter: "brightness(0) invert(1)" }} />
            </Link>
          </div>

          {/* Step list */}
          <div className="flex-1 px-5 py-8 overflow-y-auto">
            <div className="space-y-0.5">
              {STEP_META.map((meta, i) => (
                <div key={i} className={`flex items-start gap-3.5 px-3 py-3 rounded-xl transition-all ${i === step ? "bg-white/[0.07]" : ""}`}>
                  {/* Step indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-[Sora] shrink-0 mt-0.5 transition-all ${
                    i < step
                      ? "bg-[#5A9A6A] text-white"
                      : i === step
                      ? "bg-white text-[#0F1A0F]"
                      : "border border-white/20 text-white/25"
                  }`}>
                    {i < step ? (
                      <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : i + 1}
                  </div>
                  <div>
                    <div className={`text-[13px] font-semibold font-[Sora] transition-colors ${
                      i === step ? "text-white" : i < step ? "text-white/45" : "text-white/25"
                    }`}>
                      {meta.short}
                    </div>
                    <AnimatePresence>
                      {i === step && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[11.5px] text-white/40 mt-0.5 leading-snug overflow-hidden"
                        >
                          {meta.detail}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: context */}
          <div className="px-5 pb-8">
            <AnimatePresence mode="wait">
              {city && step > 0 ? (
                <motion.div
                  key="city"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.06] border border-white/10"
                >
                  <Thermometer size={16} className="text-white/50 shrink-0" />
                  <div>
                    <div className="text-[10.5px] text-white/35 font-[Sora] font-semibold tracking-widest uppercase">Live weather</div>
                    <div className="text-[13px] text-white font-semibold">{city}</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="tagline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-white/25 leading-relaxed"
                >
                  Scores 936 plant varieties against your exact conditions.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── MOBILE TOP BAR ────────────────────────────────────────── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E4E7E1]">
          <div className="flex items-center justify-between px-5 h-14">
            <Link href="/">
              <Image src="/plearnlogo.png" alt="Plearn" width={88} height={20} />
            </Link>
            <span className="text-[12.5px] font-semibold text-[#6B7280] font-[Sora]">
              {STEP_META[step].short} · {step + 1}/{TOTAL}
            </span>
          </div>
          <div className="h-0.5 bg-[#E4E7E1]">
            <motion.div className="h-full bg-[#2D5A3D]"
              animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
              transition={{ duration: 0.4, ease }} />
          </div>
        </div>

        {/* ── CONTENT AREA ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-[#F7F8F5] md:bg-white">
          <div className="min-h-full flex items-start justify-center px-5 md:px-10 pt-24 md:pt-0 md:py-0">
            <div className="w-full max-w-[480px] md:my-auto md:py-16">

              {/* Back */}
              <AnimatePresence>
                {step > 0 && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111811] transition-colors mb-6 font-medium"
                  >
                    <ArrowLeft size={14} /> Back
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Step content */}
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease }}
                  >
                    {steps[step]}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* CTA */}
              <div className="mt-6">
                {step < TOTAL - 1 ? (
                  <motion.button
                    onClick={goForward}
                    disabled={!canAdvance()}
                    whileTap={canAdvance() ? { scale: 0.98 } : {}}
                    className={`w-full py-4 rounded-full text-[15px] font-semibold font-[Sora] transition-all ${
                      canAdvance()
                        ? "bg-[#2D5A3D] text-white hover:bg-[#244930] hover:shadow-[0_8px_24px_rgba(45,90,61,0.22)] hover:-translate-y-px"
                        : "bg-[#E4E7E1] text-[#9CA3AF] cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">Continue <ArrowRight size={15} /></span>
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleSubmit}
                    disabled={loading}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className="w-full py-4 rounded-full bg-[#2D5A3D] text-white text-[15px] font-semibold font-[Sora] hover:bg-[#244930] hover:shadow-[0_8px_24px_rgba(45,90,61,0.22)] hover:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                  >
                    {loading ? (
                      <>
                        <motion.svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                          animate={{ rotate: 360 }} transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}>
                          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12"/>
                        </motion.svg>
                        Analysing 936 plants…
                      </>
                    ) : (
                      <span className="flex items-center gap-2">Analyse my conditions <ArrowRight size={15} /></span>
                    )}
                  </motion.button>
                )}

                {step === TOTAL - 1 && !loading && (
                  <p className="text-center text-[12px] text-[#9CA3AF] mt-3">
                    Preferences are optional — you can skip to get general results
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

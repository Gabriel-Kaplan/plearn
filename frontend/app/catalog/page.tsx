"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Search, Leaf, Sparkles, X, Check,
  ArrowUp, ArrowDown, Gauge, Loader2,
} from "lucide-react";
import type { UserConditions, ScoreFactor } from "@/lib/types";

const ease = [0.16, 1, 0.3, 1] as const;

type CatalogPlant = {
  id: number;
  name: string;
  type: string;
  score: number;
  cluster: number;
  image_url?: string;
  tags: string[];
};

type PersonalizedScore = {
  compatibility_score: number;
  score_confidence: number;
  top_factors: ScoreFactor[];
  breakdown: {
    climate_match: number;
    space_score: number;
    beginner_ease: number;
    safety_score: number;
    drought_score: number;
  };
  tags: string[];
};

const FILTER_OPTIONS = ["Indoor suitable", "Pet safe", "Edible", "Low maintenance"];
const PAGE_SIZE = 100;

function confidenceLabel(std: number): { text: string; color: string } {
  if (std < 5)  return { text: "Consistent score", color: "#2D5A3D" };
  if (std < 10) return { text: "Minor variation",  color: "#B08900" };
  return          { text: "Wider variation",       color: "#B8722E" };
}

function Thumb({ plant, size = 48 }: { plant: CatalogPlant; size?: number }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (plant.image_url && !failed) {
    return (
      <div className="relative rounded-xl overflow-hidden shrink-0 bg-[#EEF7F1]" style={{ width: size, height: size }}>
        {!loaded && <div className="absolute inset-0 animate-pulse" style={{ background: "#E4E7E1" }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plant.image_url} alt={plant.name} onError={() => setFailed(true)} onLoad={() => setLoaded(true)}
          className="w-full h-full object-cover transition-opacity duration-300" style={{ opacity: loaded ? 1 : 0 }} />
      </div>
    );
  }
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, background: "#EEF7F1" }}>
      <Leaf size={size * 0.42} color="#2D5A3D" />
    </div>
  );
}

export default function CatalogPage() {
  const [plants, setPlants] = useState<CatalogPlant[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selected, setSelected] = useState<CatalogPlant | null>(null);
  const [conditions, setConditions] = useState<UserConditions | null>(null);
  const [hasResults, setHasResults] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = sessionStorage.getItem("plearn_conditions");
        if (raw) setConditions(JSON.parse(raw));
        setHasResults(Boolean(sessionStorage.getItem("plearn_results")));
      } catch { /* ignore */ }
    });

    fetch("/api/plants")
      .then(res => res.json())
      .then(data => setPlants(data.plants ?? []))
      .catch(() => setError(true));
  }, []);

  const filtered = useMemo(() => {
    if (!plants) return [];
    const q = query.trim().toLowerCase();
    return plants
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q))
      .filter(p => activeFilters.every(f => p.tags.includes(f)))
      .sort((a, b) => b.score - a.score);
  }, [plants, query, activeFilters]);

  // Render only the first page instantly — rendering all ~900 cards at once
  // is what causes the scroll/typing lag, not the single /api/plants fetch.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeFilters]);

  const visiblePlants = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  function toggleFilter(tag: string) {
    setActiveFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[1040px]">
        <div className="rounded-[28px] border bg-white/90 backdrop-blur-xl border-black/[0.07] shadow-[0_10px_34px_rgba(17,24,17,0.10)]">
          <div className="h-14 flex items-center justify-between px-3 sm:px-5">
            <Link href="/" className="shrink-0">
              <Image src="/plearnlogo.png" alt="Plearn" width={92} height={20} />
            </Link>
            <Link href={hasResults ? "/results" : "/analyse"}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-2.5 sm:px-3.5 py-2 rounded-full transition-colors whitespace-nowrap">
              <ArrowLeft size={14} className="shrink-0" />
              {hasResults ? "Back to your results" : "Run an analysis"}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[1100px] mx-auto px-6">

        {/* HEADER */}
        <motion.div className="pt-24 pb-8"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <h1 className="font-[Sora] font-extrabold text-[#111811] tracking-[-0.04em] leading-[1.08] mb-3"
            style={{ fontSize: "clamp(26px, 4.5vw, 40px)" }}>
            Plant catalog
          </h1>
          <p className="text-[14px] text-[#6B7280] max-w-[540px]">
            All {plants?.length ?? 936} plants in Plearn&apos;s database. Browse instead of needing to already know a
            name — click any plant for its full breakdown{conditions ? ", personalized to your last analysis." : "."}
          </p>
          {!conditions && (
            <p className="text-[13px] text-[#B08900] mt-2">
              No saved conditions yet — <Link href="/analyse" className="underline font-semibold">run an analysis</Link> first to see personalized scores here.
            </p>
          )}
        </motion.div>

        {/* SEARCH + FILTERS */}
        <div className="mb-6">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or type…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13.5px] outline-none focus:border-[#2D5A3D] transition-colors bg-white"
              style={{ borderColor: "#E4E7E1" }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map(f => {
              const active = activeFilters.includes(f);
              return (
                <button key={f} onClick={() => toggleFilter(f)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                  style={active
                    ? { color: "#2D5A3D", background: "#EEF7F1", borderColor: "#EEF7F1" }
                    : { color: "#6B7280", background: "white", borderColor: "#E4E7E1" }}>
                  {active && <Check size={12} />}
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRID */}
        {error ? (
          <p className="text-[14px] text-[#9CA3AF] py-20 text-center">Couldn&apos;t reach the backend. Is it running?</p>
        ) : !plants ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-16">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl border animate-pulse" style={{ borderColor: "#E4E7E1", background: "#F7F8F5" }} />
            ))}
          </div>
        ) : (
          <>
            <p className="text-[12.5px] text-[#9CA3AF] mb-3">
              {visiblePlants.length} of {filtered.length} plants
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visiblePlants.map(plant => (
                <button key={plant.id} onClick={() => setSelected(plant)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-colors hover:border-[#2D5A3D]/40 hover:bg-[#F7FAF7]"
                  style={{ borderColor: "#E4E7E1" }}>
                  <Thumb plant={plant} />
                  <div className="flex-1 min-w-0">
                    <div className="font-[Sora] text-[13.5px] font-semibold text-[#111811] truncate">{plant.name}</div>
                    <div className="text-[11px] text-[#9CA3AF] truncate">{plant.type}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-[Sora] text-[18px] font-extrabold text-[#2D5A3D] leading-none">{plant.score}</div>
                    <div className="text-[9.5px] text-[#9CA3AF] mt-0.5">/ 100</div>
                  </div>
                </button>
              ))}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[#9CA3AF]" />
              </div>
            )}
            <div className="pb-16" />
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <PlantDetailModal
            plant={selected}
            conditions={conditions}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Detail modal ──────────────────────────────────────────────────────────

function PlantDetailModal({ plant, conditions, onClose }: {
  plant: CatalogPlant; conditions: UserConditions | null; onClose: () => void;
}) {
  const [personalized, setPersonalized] = useState<PersonalizedScore | "loading" | null>(
    conditions ? "loading" : null
  );

  useEffect(() => {
    if (!conditions) return;
    fetch(`/api/score-plant/${plant.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conditions),
    })
      .then(res => res.ok ? res.json() : null)
      .then(setPersonalized)
      .catch(() => setPersonalized(null));
  }, [plant.id, conditions]);

  const rows = personalized && personalized !== "loading" ? [
    { label: "Climate match", value: personalized.breakdown.climate_match },
    { label: "Space fit",     value: personalized.breakdown.space_score },
    { label: "Beginner ease", value: personalized.breakdown.beginner_ease },
    { label: "Safety",        value: personalized.breakdown.safety_score },
    { label: "Drought hardy", value: personalized.breakdown.drought_score },
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: "rgba(17,24,17,0.45)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl border w-full max-w-[420px] max-h-[85vh] overflow-y-auto"
        style={{ borderColor: "#E4E7E1" }}
      >
        <div className="relative h-32 flex items-center justify-center" style={{ background: "#EEF7F1" }}>
          <Thumb plant={plant} size={64} />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/85 text-[#6B7280] hover:text-[#111811] hover:bg-white transition-all shadow-sm">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 pt-5">
          <h3 className="font-[Sora] text-[16px] font-bold text-[#111811] tracking-[-0.02em]">{plant.name}</h3>
          <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">{plant.type}</p>
        </div>

        {!conditions ? (
          <div className="px-6 py-5">
            <div className="rounded-2xl p-5 text-center border mb-4" style={{ background: "#EEF7F1", borderColor: "#DCEBE0" }}>
              <div className="font-[Sora] font-extrabold leading-none" style={{ fontSize: "48px", color: "#2D5A3D" }}>
                {plant.score}
              </div>
              <div className="text-[12px] text-[#6B7280] mt-1.5">Generic home-suitability score</div>
            </div>
            <p className="text-[12.5px] text-[#6B7280] leading-relaxed mb-3">
              This is the plant&apos;s general score, not personalized to any conditions yet.
            </p>
            <Link href="/analyse"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-[13.5px] font-semibold font-[Sora] text-white transition-all"
              style={{ background: "#2D5A3D" }}>
              Run an analysis for your score <ArrowRight size={14} />
            </Link>
          </div>
        ) : personalized === "loading" ? (
          <div className="px-6 py-10 flex items-center justify-center gap-2 text-[13px] text-[#9CA3AF]">
            <Loader2 size={16} className="animate-spin" /> Scoring for your conditions…
          </div>
        ) : personalized ? (
          <div className="px-6 py-5">
            <div className="rounded-2xl p-5 text-center border mb-4" style={{ background: "#EEF7F1", borderColor: "#DCEBE0" }}>
              <div className="font-[Sora] font-extrabold leading-none" style={{ fontSize: "48px", color: "#2D5A3D" }}>
                {personalized.compatibility_score}
              </div>
              <div className="text-[12px] text-[#6B7280] mt-1.5">Your compatibility score</div>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] font-semibold"
                style={{ color: confidenceLabel(personalized.score_confidence).color }}>
                <Gauge size={12} />
                ± {personalized.score_confidence} · {confidenceLabel(personalized.score_confidence).text}
              </div>
            </div>

            {personalized.top_factors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {personalized.top_factors.map(f => (
                  <span key={f.label}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={f.direction === "positive"
                      ? { color: "#2D5A3D", background: "#EEF7F1" }
                      : { color: "#B23B3B", background: "#FBEEEE" }}>
                    {f.direction === "positive" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    {f.label}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {rows.map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-[12px] text-[#6B7280] w-24 shrink-0">{row.label}</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden bg-[#E4E7E1]">
                    <div className="h-full rounded-full" style={{ width: `${row.value}%`, background: "#2D5A3D" }} />
                  </div>
                  <span className="text-[12px] font-bold w-7 text-right font-[Sora]" style={{ color: "#2D5A3D" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {personalized.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {personalized.tags.map(tag => (
                  <span key={tag} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: "#2D5A3D", background: "#EEF7F1" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <Sparkles size={20} color="#9CA3AF" className="mx-auto mb-2" />
            <p className="text-[13px] text-[#9CA3AF]">Couldn&apos;t score this plant right now.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

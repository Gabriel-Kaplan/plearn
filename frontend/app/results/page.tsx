"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Thermometer, Sun, Droplets, Leaf, RefreshCw, Sparkles,
  Cloud, CloudRain, CloudDrizzle, CloudLightning, CloudSnow, CloudFog,
  Info, ArrowUpDown, ChevronDown, Check, Copy, Heart, X, Pencil, Columns2, Loader2,
  Gauge, ArrowUp, ArrowDown, Shuffle, Download, Replace,
} from "lucide-react";
import type { RecommendResponse, Plant, Substitute, UserConditions } from "@/lib/types";

// MC Dropout gives a real spread across stochastic forward passes — translate
// the raw standard deviation into a plain-language label. Framed around the
// score's consistency (a property of this plant/condition combo) rather than
// "model confidence", so it reads as informative rather than a red flag.
function confidenceLabel(std: number): { text: string; color: string } {
  if (std < 5)  return { text: "Consistent score", color: "#2D5A3D" };
  if (std < 10) return { text: "Minor variation",  color: "#B08900" };
  return          { text: "Wider variation",       color: "#B8722E" };
}

// OpenWeatherMap's `description` field follows a fixed vocabulary — match it
// to a representative icon instead of always showing a static sun.
function WeatherIcon({ description, size = 13 }: { description: string; size?: number }) {
  const d = description.toLowerCase();
  if (d.includes("thunder"))                          return <CloudLightning size={size} />;
  if (d.includes("snow"))                              return <CloudSnow size={size} />;
  if (d.includes("drizzle"))                           return <CloudDrizzle size={size} />;
  if (d.includes("rain") || d.includes("shower"))       return <CloudRain size={size} />;
  if (d.includes("mist") || d.includes("fog") || d.includes("haze")) return <CloudFog size={size} />;
  if (d.includes("cloud"))                             return <Cloud size={size} />;
  return <Sun size={size} />;
}

// ─── Palette (light — matches onboarding & landing) ───────────────────────────
// bg:          #FFFFFF   page background
// bg-subtle:   #F7F8F5   secondary sections, chips, care cards
// border:      #E4E7E1   card borders
// text:        #111811   headings / primary text
// text-muted:  #6B7280   secondary text
// text-faint:  #9CA3AF   tertiary text
// green:       #2D5A3D   brand accent — top match
// green-tint:  #EEF7F1   selected / accent background
// purple:      #6B48C8   hidden gem accent
// purple-tint: #F5F4FF   hidden gem background

const ease = [0.16, 1, 0.3, 1] as const;

const listContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const listItem = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.44, ease } },
};

// ─── Care requirements formatting ─────────────────────────────────────────────
// Served directly from Plant.care (collected in the original bulk pull, present
// for all 936 plants) rather than a live third-party call — see lib/backend.ts.

function formatSunlight(sunlight: string | null | undefined): string {
  if (!sunlight) return "—";
  return sunlight.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Botanical substitutes fetch ──────────────────────────────────────────────
// Same KMeans cluster as the plant, ranked by overall_home_score — the
// substitution engine from Model 2, wired up via /api/similar/[name].

type RawSimilarPlant = {
  id: number; common_name: string; type: string;
  overall_home_score: number; image_url: string | null;
};

const substitutesCache = new Map<string, Substitute[]>();

async function fetchSubstitutes(name: string): Promise<Substitute[]> {
  const key = name.toLowerCase();
  if (substitutesCache.has(key)) return substitutesCache.get(key)!;
  try {
    const res = await fetch(`/api/similar/${encodeURIComponent(name)}`);
    const raw = await res.json();
    if (!res.ok || !Array.isArray(raw)) { substitutesCache.set(key, []); return []; }
    const mapped = (raw as RawSimilarPlant[]).map(r => ({
      id: r.id,
      name: r.common_name,
      type: r.type,
      score: Math.round(r.overall_home_score),
      image_url: r.image_url ?? undefined,
    }));
    substitutesCache.set(key, mapped);
    return mapped;
  } catch {
    substitutesCache.set(key, []);
    return [];
  }
}

// ─── Wikipedia description fetch ─────────────────────────────────────────────

const wikiCache = new Map<string, string | null>();

async function fetchWikiSummary(plantName: string): Promise<string | null> {
  const key = plantName.toLowerCase();
  if (wikiCache.has(key)) return wikiCache.get(key)!;

  try {
    const slug = encodeURIComponent(plantName.trim().replace(/ /g, "_"));
    const res  = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) { wikiCache.set(key, null); return null; }
    const data  = await res.json();
    const text: string = data.extract ?? "";
    if (!text) { wikiCache.set(key, null); return null; }
    // First 2 sentences, max 300 chars
    const sentences = text.split(/(?<=[.!?])\s+/);
    let out = sentences[0] ?? "";
    if (sentences[1] && (out + " " + sentences[1]).length <= 300) out += " " + sentences[1];
    wikiCache.set(key, out);
    return out;
  } catch {
    wikiCache.set(key, null);
    return null;
  }
}

// ─── LLM-generated summary (local Ollama, grounded in the actual score data) ──

const summaryCache = new Map<string, string | null>();

async function fetchPlantSummary(plant: Plant): Promise<string | null> {
  const key = `${plant.name}-${plant.compatibility_score}-${plant.top_factors.map(f => f.label).join(",")}`;
  if (summaryCache.has(key)) return summaryCache.get(key)!;
  try {
    const res = await fetch("/api/plant-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: plant.name,
        type: plant.type,
        score: plant.compatibility_score,
        tags: plant.tags,
        factors: plant.top_factors,
      }),
    });
    if (!res.ok) { summaryCache.set(key, null); return null; }
    const data = await res.json();
    const summary = data.summary ?? null;
    summaryCache.set(key, summary);
    return summary;
  } catch {
    summaryCache.set(key, null);
    return null;
  }
}

// ─── Tag helpers ──────────────────────────────────────────────────────────────
// The same 2-3 tags (Pet safe, Edible) tend to repeat across an entire list when
// a preference narrows the pool. Surface whichever tag is rarest across the
// currently-displayed list instead, so cards actually look distinct from each other.

function highlightTag(plant: Plant, allPlants: Plant[]): string | null {
  if (plant.tags.length === 0) return null;
  const freq = new Map<string, number>();
  for (const p of allPlants) {
    for (const t of p.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...plant.tags].sort((a, b) => (freq.get(a) ?? 0) - (freq.get(b) ?? 0))[0];
}

// ─── Share summary ────────────────────────────────────────────────────────────

function buildShareText(plant: Plant): string {
  const b = plant.breakdown;
  return [
    `${plant.name} — ${plant.compatibility_score}/100 compatibility${plant.is_hidden_gem ? " (hidden gem)" : ""}`,
    plant.tags.length > 0 ? plant.tags.join(" · ") : null,
    `Climate ${b.climate_match} · Space ${b.space_score} · Beginner ${b.beginner_ease} · Safety ${b.safety_score} · Drought ${b.drought_score}`,
    "— via Plearn",
  ].filter((line): line is string => Boolean(line)).join("\n");
}

// ─── Plant image ──────────────────────────────────────────────────────────────

function PlantThumb({ plant, accent, tint, size = 44 }: {
  plant: Plant; accent: string; tint: string; size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (plant.image_url && !failed) {
    return (
      <div className="relative rounded-xl overflow-hidden shrink-0" style={{ width: size, height: size }}>
        {!loaded && <div className="absolute inset-0 animate-pulse" style={{ background: "#E4E7E1" }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plant.image_url}
          alt={plant.name}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      </div>
    );
  }
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size, background: tint }}>
      {plant.is_hidden_gem ? <Sparkles size={size * 0.42} color={accent} /> : <Leaf size={size * 0.42} color={accent} />}
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div className="flex-1 h-1 rounded-full overflow-hidden bg-[#E4E7E1]">
      <motion.div className="h-full rounded-full" style={{ background: accent }}
        initial={{ width: 0 }} animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease, delay: 0.1 }} />
    </div>
  );
}

// ─── Breakdown panel ──────────────────────────────────────────────────────────

function BreakdownPanel({ plant, onClose, isFavorite, onToggleFavorite }: {
  plant: Plant; onClose?: () => void; isFavorite: boolean; onToggleFavorite: () => void;
}) {
  const isGem  = plant.is_hidden_gem;
  const accent = isGem ? "#6B48C8" : "#2D5A3D";
  const tint   = isGem ? "#F5F4FF" : "#EEF7F1";
  const border = isGem ? "#D4CEEF" : "#DCEBE0";

  const [wikiDesc, setWikiDesc] = useState<string | null | "loading">("loading");
  const [aiSummary, setAiSummary] = useState<string | null | "loading">("loading");
  const [substitutes, setSubstitutes] = useState<Substitute[] | "loading">("loading");
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(buildShareText(plant)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  useEffect(() => {
    fetchWikiSummary(plant.name).then(setWikiDesc);
  }, [plant.name]);

  useEffect(() => {
    fetchPlantSummary(plant).then(setAiSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant.name]);

  useEffect(() => {
    fetchSubstitutes(plant.name).then(setSubstitutes);
  }, [plant.name]);

  const rows = [
    { key: "climate_match", label: "Climate match", value: plant.breakdown.climate_match,
      explain: "How well this plant's hardiness zone, sunlight needs, and drought tolerance match your local climate." },
    { key: "space_score", label: "Space fit", value: plant.breakdown.space_score,
      explain: "How well the plant's mature size and growth habit suit your available space." },
    { key: "beginner_ease", label: "Beginner ease", value: plant.breakdown.beginner_ease,
      explain: "Based on care level, maintenance needs, watering frequency, and growth rate." },
    { key: "safety_score", label: "Safety", value: plant.breakdown.safety_score,
      explain: "Accounts for toxicity to humans and pets, thorns, and invasiveness." },
    { key: "drought_score", label: "Drought hardy", value: plant.breakdown.drought_score,
      explain: "How well the plant tolerates low water and dry conditions." },
  ];

  return (
    <div className="rounded-2xl border overflow-hidden bg-white shadow-[0_2px_20px_rgba(17,24,17,0.05)]" style={{ borderColor: "#E4E7E1" }}>

      {/* Photo */}
      <div className="relative h-40 flex items-center justify-center overflow-hidden" style={{ background: tint }}>
        {plant.image_url && !imgFailed ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 animate-pulse" style={{ background: "#E4E7E1" }} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={plant.image_url} alt={plant.name}
              onError={() => setImgFailed(true)} onLoad={() => setImgLoaded(true)}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: imgLoaded ? 1 : 0 }} />
          </>
        ) : (
          isGem ? <Sparkles size={40} color={accent} strokeWidth={1.4} /> : <Leaf size={40} color={accent} strokeWidth={1.4} />
        )}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button onClick={onToggleFavorite} title={isFavorite ? "Remove from saved" : "Save this plant"}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/85 hover:bg-white transition-all shrink-0 shadow-sm"
            style={{ color: isFavorite ? "#E0556B" : "#6B7280" }}>
            <Heart size={14} fill={isFavorite ? "#E0556B" : "none"} />
          </button>
          <button onClick={handleCopy} title="Copy summary"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/85 text-[#6B7280] hover:text-[#111811] hover:bg-white transition-all shrink-0 shadow-sm">
            {copied ? <Check size={14} color="#2D5A3D" /> : <Copy size={13} />}
          </button>
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/85 text-[#6B7280] hover:text-[#111811] hover:bg-white transition-all shrink-0 shadow-sm">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="px-6 pt-5 pb-0">
        <div className="text-[10px] font-bold tracking-[0.1em] uppercase font-[Sora] mb-1.5"
          style={{ color: accent }}>
          {isGem ? "Hidden gem" : "Top match"}
        </div>
        <h3 className="font-[Sora] text-[16px] font-bold text-[#111811] tracking-[-0.02em] leading-tight">
          {plant.name}
        </h3>
        {plant.scientific_name && (
          <p className="text-[11.5px] text-[#9CA3AF] italic mt-0.5">{plant.scientific_name}</p>
        )}
      </div>

      {/* Wikipedia description */}
      <div className="px-6 pt-3 pb-0">
        {wikiDesc === "loading" ? (
            <div className="space-y-1.5">
              {[1, 0.8, 0.6].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-[#F0F2EE] animate-pulse"
                  style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          ) : wikiDesc ? (
            <motion.p className="text-[12.5px] text-[#6B7280] leading-[1.7]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}>
              {wikiDesc}
            </motion.p>
          ) : null}
      </div>

      {/* Score hero */}
      <div className="px-6 py-4">
        <motion.div className="rounded-2xl p-5 text-center border" style={{ background: tint, borderColor: border }}
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease }}>
          <div className="font-[Sora] font-extrabold leading-none tracking-[-0.06em]"
            style={{ fontSize: "64px", color: accent }}>
            {plant.compatibility_score}
          </div>
          <div className="text-[12px] text-[#6B7280] mt-1.5">Compatibility score</div>
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] font-semibold"
            style={{ color: confidenceLabel(plant.score_confidence).color }}
            title="From MC Dropout: the model scored this plant ~15 times with dropout left active, to see how much the score moves around. A tight spread means this exact combination is well covered by past data; a wider spread just means it's a less common combination, worth a quick gut-check.">
            <Gauge size={12} />
            ± {plant.score_confidence} · {confidenceLabel(plant.score_confidence).text}
          </div>
        </motion.div>
      </div>

      {/* Why this score */}
      {plant.top_factors.length > 0 && (
        <div className="px-6 pb-1">
          <div className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase font-[Sora] mb-2.5">
            Why this score
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {plant.top_factors.map(f => (
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
          {aiSummary === "loading" ? (
            <div className="space-y-1.5 mb-1">
              {[1, 0.7].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-[#F0F2EE] animate-pulse" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          ) : aiSummary ? (
            <motion.p className="text-[12.5px] text-[#374151] leading-[1.6] mb-1"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {aiSummary}
            </motion.p>
          ) : null}
        </div>
      )}

      {/* Breakdown bars */}
      <div className="px-6 pb-5">
        <div className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase font-[Sora] mb-3">
          Score breakdown
        </div>
        <div className="space-y-1">
          {rows.map(row => (
            <div key={row.key}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExpandedRow(expandedRow === row.key ? null : row.key)}
                  className="flex items-center gap-1 text-[12px] text-[#6B7280] w-24 shrink-0 text-left hover:text-[#111811] transition-colors"
                >
                  {row.label}
                  <Info size={11} className="text-[#B7BEB9] shrink-0" />
                </button>
                <ScoreBar value={row.value} accent={accent} />
                <span className="text-[12px] font-bold w-7 text-right font-[Sora]" style={{ color: accent }}>
                  {row.value}
                </span>
              </div>
              <AnimatePresence>
                {expandedRow === row.key && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[11.5px] text-[#9CA3AF] leading-relaxed pt-1.5 pb-1 overflow-hidden"
                  >
                    {row.explain}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {plant.tags.length > 0 && (
        <div className="px-6 pb-5 border-t pt-4" style={{ borderColor: "#EDEFEA" }}>
          <div className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase font-[Sora] mb-2.5">
            Characteristics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {plant.tags.map(tag => (
              <span key={tag} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border"
                style={{ color: accent, borderColor: border, background: tint }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Substitutes */}
      {(substitutes === "loading" || substitutes.length > 0) && (
        <div className="px-6 pb-6 border-t pt-4" style={{ borderColor: "#EDEFEA" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Replace size={12} color="#9CA3AF" />
            <div className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.1em] uppercase font-[Sora]">
              Botanical substitutes
            </div>
          </div>
          <p className="text-[11.5px] text-[#9CA3AF] leading-relaxed mb-3">
            Closest alternatives from the same botanical cluster — good options if this plant is hard to find or won&apos;t work out.
          </p>
          {substitutes === "loading" ? (
            <div className="space-y-2">
              {[0, 1].map(i => (
                <div key={i} className="h-[52px] rounded-xl bg-[#F7F8F5] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {substitutes.map(sub => (
                <div key={sub.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border"
                  style={{ background: "#F7F8F5", borderColor: "#E4E7E1" }}>
                  <div>
                    <div className="text-[13px] font-semibold text-[#111811]">{sub.name}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{sub.type}</div>
                  </div>
                  <div className="font-[Sora] text-[18px] font-bold" style={{ color: "#2D5A3D" }}>
                    {sub.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Care requirements panel ───────────────────────────────────────────────────
// Its own standalone panel (not buried inside the breakdown) since live care
// data is one of the things people most need to actually see, not scroll past.

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

// Categorical care labels only mean something with the standard horticultural
// definition attached — "Annual" and "Full Sun" are jargon on their own.
function wateringCaption(days: number | null | undefined): string {
  if (days == null) return "";
  const rounded = Math.round(days);
  return `Every ${rounded} day${rounded === 1 ? "" : "s"}`;
}

function sunlightCaption(sunlight: string | null | undefined): string {
  const s = (sunlight ?? "").toLowerCase();
  if (s.includes("full_sun") || s === "full sun") return "6+ hrs direct sun/day";
  if (s.includes("part")) return "3–6 hrs direct sun/day";
  if (s.includes("shade")) return "Under 3 hrs direct sun/day";
  return "";
}

function cycleCaption(cycle: string | null | undefined): string {
  const c = (cycle ?? "").toLowerCase();
  if (c.includes("biennial")) return "Two-year lifecycle, then flowers and dies";
  if (c.includes("annual")) return "One growing season, then replant";
  if (c.includes("perennial")) return "Regrows on its own, year after year";
  return "";
}

function CareRequirementsPanel({ plant }: { plant: Plant }) {
  const isGem  = plant.is_hidden_gem;
  const accent = isGem ? "#6B48C8" : "#2D5A3D";
  const tint   = isGem ? "#F5F4FF" : "#EEF7F1";
  const care   = plant.care;

  return (
    <div className="rounded-2xl border overflow-hidden bg-white shadow-[0_2px_20px_rgba(17,24,17,0.05)]" style={{ borderColor: "#E4E7E1" }}>
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={{ borderColor: "#EDEFEA" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint }}>
          <Droplets size={19} color={accent} />
        </div>
        <div>
          <h3 className="font-[Sora] text-[16px] font-bold text-[#111811] tracking-[-0.01em]">Care requirements</h3>
          <p className="text-[12px] text-[#9CA3AF]">For {plant.name}</p>
        </div>
      </div>

      <div className="p-6">
        {care ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Droplets size={16} />, label: "Watering",   value: care.watering ? capitalize(care.watering) : "—", caption: wateringCaption(care.watering_days) },
              { icon: <Sun size={16} />,      label: "Sunlight",   value: formatSunlight(care.sunlight), caption: sunlightCaption(care.sunlight) },
              { icon: <Leaf size={16} />,     label: "Care level", value: care.care_level || "—", caption: "" },
              { icon: <RefreshCw size={16} />,label: "Cycle",      value: care.cycle || "—", caption: cycleCaption(care.cycle) },
            ].map(({ icon, label, value, caption }) => (
              <div key={label} className="rounded-xl px-4 py-4 border min-w-0"
                style={{ background: "#F7F8F5", borderColor: "#E4E7E1" }}>
                <div className="flex items-center gap-1.5 mb-2" style={{ color: accent }}>
                  {icon}
                  <span className="text-[11px] font-bold tracking-[0.08em] uppercase font-[Sora] truncate">{label}</span>
                </div>
                <div className="text-[14px] font-semibold text-[#374151] leading-snug">{value}</div>
                {caption && <div className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">{caption}</div>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#9CA3AF] text-center py-4">Care details unavailable for this plant.</p>
        )}
      </div>
    </div>
  );
}

// ─── Plant card ───────────────────────────────────────────────────────────────

function PlantCard({
  plant, rank, selected, onSelect, tags, isFavorite, onToggleFavorite,
  compareMode = false, compareSelected = false, onToggleCompare,
}: {
  plant: Plant; rank?: number; selected: boolean; onSelect: () => void; tags: string[];
  isFavorite: boolean; onToggleFavorite: () => void;
  compareMode?: boolean; compareSelected?: boolean; onToggleCompare?: () => void;
}) {
  const isGem  = plant.is_hidden_gem;
  const accent = isGem ? "#6B48C8" : "#2D5A3D";
  const tint   = isGem ? "#F5F4FF" : "#EEF7F1";
  const border = isGem ? "#D4CEEF" : accent;

  return (
    <motion.div
      onClick={compareMode ? onToggleCompare : onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (compareMode ? onToggleCompare : onSelect)?.();
        }
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="rounded-2xl border-2 cursor-pointer transition-all duration-200"
      style={{
        background: compareSelected ? "#EEF7F1" : selected ? tint : "white",
        borderColor: compareSelected ? "#2D5A3D" : selected ? border : "#E4E7E1",
        boxShadow: (selected || compareSelected) ? `0 0 0 1px ${compareSelected ? "#2D5A3D" : border}` : "none",
      }}
    >
      <div className="flex items-center gap-3.5 p-4">
        {/* Rank or compare checkbox */}
        {compareMode ? (
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
            compareSelected ? "bg-[#2D5A3D] border-[#2D5A3D]" : "border-[#D1D5DB]"
          }`}>
            {compareSelected && <Check size={12} color="white" />}
          </div>
        ) : rank !== undefined && (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-[Sora] shrink-0 ${
            rank === 1 ? "bg-[#FFD700] text-[#7A5700]" :
            rank === 2 ? "bg-[#E4E7E1] text-[#6B7280]" :
            rank === 3 ? "bg-[#C87B4A] text-white" :
            "bg-[#F7F8F5] text-[#9CA3AF]"
          }`}>
            {rank}
          </div>
        )}

        {/* Photo / icon */}
        <PlantThumb plant={plant} accent={accent} tint={tint} size={44} />

        {/* Name + type + tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-[Sora] text-[14px] font-semibold text-[#111811] leading-tight">
              {plant.name}
            </span>
            {isGem && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "#EDE9FF", color: "#6B48C8" }}>
                Hidden gem ✦
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-[10.5px] px-2 py-0.5 rounded-full text-[#6B7280] bg-[#F7F8F5]">
              {plant.type}
            </span>
            {tags.map(t => (
              <span key={t} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: accent, background: tint }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Favorite */}
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
          title={isFavorite ? "Remove from saved" : "Save this plant"}
          className="shrink-0 p-1 -m-1 rounded-full hover:bg-[#F7F8F5] transition-colors"
          style={{ color: isFavorite ? "#E0556B" : "#D1D5DB" }}
        >
          <Heart size={16} fill={isFavorite ? "#E0556B" : "none"} />
        </button>

        {/* Score */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" title={`± ${plant.score_confidence} · ${confidenceLabel(plant.score_confidence).text}`}
              style={{ background: confidenceLabel(plant.score_confidence).color }} />
            <div className="font-[Sora] font-extrabold leading-none tracking-[-0.04em]"
              style={{ fontSize: "24px", color: accent }}>
              {plant.compatibility_score}
            </div>
          </div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">/ 100</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Custom dropdown (no native <select> chrome) ──────────────────────────────

function Dropdown<T extends string>({ value, options, onChange }: {
  value: T; options: { key: T; label: string }[]; onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.key === value);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[12.5px] font-medium text-[#374151] bg-white border rounded-lg pl-3 pr-2.5 py-1.5 outline-none cursor-pointer hover:border-[#C7CDC5] transition-colors"
        style={{ borderColor: open ? "#2D5A3D" : "#E4E7E1" }}
      >
        <ArrowUpDown size={13} className="text-[#9CA3AF]" />
        {current?.label}
        <ChevronDown size={14} className="text-[#9CA3AF] transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[168px] bg-white rounded-xl border shadow-[0_12px_32px_rgba(17,24,17,0.12)] py-1.5 overflow-hidden"
            style={{ borderColor: "#E4E7E1" }}
          >
            {options.map(o => (
              <button
                key={o.key}
                onClick={() => { onChange(o.key); setOpen(false); }}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-[13px] font-medium text-left hover:bg-[#F7F8F5] transition-colors"
                style={{ color: o.key === value ? "#2D5A3D" : "#374151" }}
              >
                {o.label}
                {o.key === value && <Check size={14} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compare modal ─────────────────────────────────────────────────────────────

const COMPARE_ROWS: { key: keyof Plant["breakdown"]; label: string }[] = [
  { key: "climate_match",  label: "Climate match" },
  { key: "space_score",    label: "Space fit" },
  { key: "beginner_ease",  label: "Beginner ease" },
  { key: "safety_score",   label: "Safety" },
  { key: "drought_score",  label: "Drought hardy" },
];

function CompareModal({ plants, onClose, onRemove }: {
  plants: Plant[]; onClose: () => void; onRemove: (plant: Plant) => void;
}) {
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
        className="bg-white rounded-2xl border w-full max-w-[900px] max-h-[85vh] overflow-y-auto"
        style={{ borderColor: "#E4E7E1" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: "#F0F2EE" }}>
          <h3 className="font-[Sora] text-[15px] font-bold text-[#111811]">Comparing {plants.length} plants</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111811] hover:bg-[#F7F8F5] transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {plants.map(plant => {
            const accent = plant.is_hidden_gem ? "#6B48C8" : "#2D5A3D";
            const tint   = plant.is_hidden_gem ? "#F5F4FF" : "#EEF7F1";
            return (
              <div key={plant.id ?? plant.name} className="rounded-xl border p-4" style={{ borderColor: "#E4E7E1" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-[Sora] text-[14px] font-bold text-[#111811]">{plant.name}</div>
                    <div className="text-[11px] text-[#9CA3AF]">{plant.type}</div>
                  </div>
                  <button onClick={() => onRemove(plant)} className="text-[#9CA3AF] hover:text-[#111811] transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>

                <div className="rounded-xl p-3 text-center mb-4" style={{ background: tint }}>
                  <div className="font-[Sora] font-extrabold leading-none" style={{ fontSize: "36px", color: accent }}>
                    {plant.compatibility_score}
                  </div>
                  <div className="text-[10.5px] text-[#6B7280] mt-1">Compatibility</div>
                </div>

                <div className="space-y-2">
                  {COMPARE_ROWS.map(row => (
                    <div key={row.key} className="flex items-center gap-2">
                      <span className="text-[10.5px] text-[#6B7280] w-16 shrink-0">{row.label}</span>
                      <ScoreBar value={plant.breakdown[row.key]} accent={accent} />
                      <span className="text-[10.5px] font-bold w-6 text-right" style={{ color: accent }}>
                        {plant.breakdown[row.key]}
                      </span>
                    </div>
                  ))}
                </div>

                {plant.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4">
                    {plant.tags.map(t => (
                      <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: accent, background: tint }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "all" | "gems" | "diverse" | "saved";
type SortKey = "match" | keyof Plant["breakdown"];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "match",         label: "Best match" },
  { key: "beginner_ease", label: "Beginner ease" },
  { key: "drought_score", label: "Drought hardy" },
  { key: "space_score",   label: "Space fit" },
  { key: "safety_score",  label: "Safety" },
];

const FILTER_OPTIONS = ["Indoor suitable", "Pet safe", "Edible", "Low maintenance"];
const FAVORITES_KEY = "plearn_favorites";
const MAX_COMPARE = 3;

const EDIT_SPACE_OPTIONS: { value: UserConditions["space"]; label: string }[] = [
  { value: "balcony",    label: "Balcony" },
  { value: "garden",     label: "Garden" },
  { value: "windowsill", label: "Windowsill" },
  { value: "indoor",     label: "Indoor" },
];
const EDIT_EXPERIENCE_OPTIONS: { value: UserConditions["experience"]; label: string }[] = [
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert",       label: "Expert" },
];
const EDIT_LIGHT_OPTIONS: { value: UserConditions["light"]; label: string }[] = [
  { value: "full_sun",      label: "Full sun" },
  { value: "partial_shade", label: "Partial shade" },
  { value: "full_shade",    label: "Full shade" },
];
const EDIT_PREF_OPTIONS: { key: keyof UserConditions["preferences"]; label: string }[] = [
  { key: "edible",            label: "Edible" },
  { key: "pet_safe",          label: "Pet safe" },
  { key: "drought_resistant", label: "Drought hardy" },
  { key: "low_maintenance",   label: "Low maintenance" },
];

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults]       = useState<RecommendResponse | null>(null);
  const [conditions, setConditions] = useState<UserConditions | null>(null);
  const [selected, setSelected]     = useState<Plant | null>(null);
  const [tab, setTab]               = useState<Tab>("all");
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [sortBy, setSortBy]         = useState<SortKey>("match");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [favorites, setFavorites]   = useState<Plant[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [compareMode, setCompareMode]         = useState(false);
  const [compareSelection, setCompareSelection] = useState<Plant[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [editingConditions, setEditingConditions] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [editDraft, setEditDraft] = useState<UserConditions | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const raw  = sessionStorage.getItem("plearn_results");
      const cond = sessionStorage.getItem("plearn_conditions");
      if (!raw) { router.push("/analyse"); return; }
      const data = JSON.parse(raw) as RecommendResponse;
      setResults(data);
      if (data.plants.length > 0) {
        setSelected(data.plants[0]);
        setMobileOpen(data.plants[0].name);
      }
      if (cond) setConditions(JSON.parse(cond));

      try {
        const favRaw = localStorage.getItem(FAVORITES_KEY);
        if (favRaw) setFavorites(JSON.parse(favRaw));
      } catch { /* ignore corrupt storage */ }
      setFavoritesLoaded(true);
    });
  }, [router]);

  useEffect(() => {
    if (favoritesLoaded) localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, favoritesLoaded]);

  if (!results) {
    const shimmer = "animate-pulse bg-[#F0F2EE] rounded-full";
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="h-16 flex items-center border-b" style={{ borderColor: "#F0F2EE" }}>
            <div className={`${shimmer} h-5 w-24`} />
          </div>

          <div className="pt-8 pb-10">
            <div className={`${shimmer} h-3 w-56 mb-5`} />
            <div className={`${shimmer} h-9 w-[420px] max-w-full mb-4`} />
            <div className={`${shimmer} h-3 w-64`} />
          </div>

          <div className={`${shimmer} h-9 w-56 !rounded-xl mb-6`} />
          <div className="flex gap-1.5 mb-5">
            {[0, 1, 2].map(i => <div key={i} className={`${shimmer} h-8 w-24 !rounded-full`} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl border p-4 flex items-center gap-3.5" style={{ borderColor: "#E4E7E1" }}>
                  <div className={`${shimmer} w-11 h-11 !rounded-xl shrink-0`} />
                  <div className="flex-1 space-y-2">
                    <div className={`${shimmer} h-3.5 w-32`} />
                    <div className={`${shimmer} h-2.5 w-20`} />
                  </div>
                  <div className={`${shimmer} h-6 w-10 shrink-0`} />
                </div>
              ))}
            </div>
            <div className="hidden lg:block rounded-2xl border overflow-hidden" style={{ borderColor: "#E4E7E1" }}>
              <div className={`${shimmer} h-40 !rounded-none`} />
              <div className="p-6 space-y-3">
                <div className={`${shimmer} h-3 w-20`} />
                <div className={`${shimmer} h-5 w-36`} />
                <div className={`${shimmer} h-16 w-full !rounded-2xl mt-4`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function applyFilters(list: Plant[], filters: string[]) {
    return filters.length === 0 ? list : list.filter(p => filters.every(f => p.tags.includes(f)));
  }

  function getBaseList(t: Tab): Plant[] {
    if (t === "gems") return results!.hidden_gems;
    if (t === "diverse") return results!.diverse_set;
    if (t === "saved") return favorites;
    return results!.plants;
  }

  function isFavorited(plant: Plant) {
    return favorites.some(f => f.id === plant.id && f.name === plant.name);
  }

  function toggleFavorite(plant: Plant) {
    setFavorites(prev =>
      prev.some(f => f.id === plant.id && f.name === plant.name)
        ? prev.filter(f => !(f.id === plant.id && f.name === plant.name))
        : [...prev, plant]
    );
  }

  function toggleCompare(plant: Plant) {
    setCompareSelection(prev => {
      const already = prev.some(p => p.id === plant.id && p.name === plant.name);
      if (already) return prev.filter(p => !(p.id === plant.id && p.name === plant.name));
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, plant];
    });
  }

  const baseList = getBaseList(tab);
  const filteredPlants = applyFilters(baseList, activeFilters);
  const displayPlants = sortBy === "match"
    ? filteredPlants
    : [...filteredPlants].sort((a, b) => b.breakdown[sortBy] - a.breakdown[sortBy]);

  function switchTab(newTab: Tab) {
    const base = getBaseList(newTab);
    const list = applyFilters(base, activeFilters);
    setTab(newTab);
    setSelected(list.length > 0 ? list[0] : null);
    setMobileOpen(list.length > 0 ? list[0].name : null);
  }

  function toggleFilter(tag: string) {
    const next = activeFilters.includes(tag)
      ? activeFilters.filter(t => t !== tag)
      : [...activeFilters, tag];
    const list = applyFilters(baseList, next);
    setActiveFilters(next);
    setSelected(list.length > 0 ? list[0] : null);
    setMobileOpen(list.length > 0 ? list[0].name : null);
  }

  function clearFilters() {
    setActiveFilters([]);
    setSelected(baseList.length > 0 ? baseList[0] : null);
    setMobileOpen(baseList.length > 0 ? baseList[0].name : null);
  }

  function openEditConditions() {
    if (!conditions) return;
    setEditDraft({ ...conditions, preferences: { ...conditions.preferences } });
    setEditingConditions(true);
  }

  async function applyEditedConditions() {
    if (!editDraft) return;
    setReanalyzing(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json() as RecommendResponse;
      sessionStorage.setItem("plearn_results", JSON.stringify(data));
      sessionStorage.setItem("plearn_conditions", JSON.stringify(editDraft));
      setResults(data);
      setConditions(editDraft);
      setTab("all");
      setActiveFilters([]);
      setSelected(data.plants.length > 0 ? data.plants[0] : null);
      setMobileOpen(data.plants.length > 0 ? data.plants[0].name : null);
      setEditingConditions(false);
    } catch {
      // leave the panel open so the user can retry
    } finally {
      setReanalyzing(false);
    }
  }

  const condParts = conditions
    ? [conditions.city, conditions.space, conditions.experience].map(s => s.replace("_", " "))
    : [];

  // A real PDF download (not the browser print dialog) — just the ranked
  // list. jsPDF/autoTable are loaded on demand so they never add to the
  // page's normal bundle size.
  async function downloadAnalysisPDF() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const GREEN:  [number, number, number] = [45, 90, 61];
    const GEM:    [number, number, number] = [107, 72, 200];
    const GRAY:   [number, number, number] = [107, 114, 128];
    const LGRAY:  [number, number, number] = [156, 163, 175];
    const TINT:   [number, number, number] = [238, 247, 241];

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setProperties({
      title: "Plearn — Personalized Plant Analysis",
      subject: "Plant compatibility recommendations",
      author: "Plearn",
    });
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...GREEN);
    doc.text("Plearn", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text("Personalized plant analysis", margin, y + 5.5);
    doc.setFontSize(8);
    doc.setTextColor(...LGRAY);
    doc.text("Scored live against your exact conditions — plearn.app", margin, y + 10.5);

    doc.setFontSize(9);
    doc.setTextColor(...LGRAY);
    doc.text(
      new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      pageWidth - margin, y, { align: "right" }
    );

    y += 15;
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    if (condParts.length > 0) {
      doc.setFontSize(9.5);
      const label = "Your conditions:  ";
      const condLine = condParts.join("   ·   ");
      const boxWidth = pageWidth - margin * 2;
      const boxHeight = 9;
      doc.setFillColor(...TINT);
      doc.roundedRect(margin, y, boxWidth, boxHeight, 2.2, 2.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN);
      doc.text(label, margin + 4, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 70, 60);
      doc.text(condLine, margin + 4 + doc.getTextWidth(label), y + 6);
      y += boxHeight + 8;
    }

    const gemFlags = results!.plants.map(p => p.is_hidden_gem);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Plant", "Type", "Score", "Why this score"]],
      body: results!.plants.map((p, i) => [
        String(i + 1),
        (p.is_hidden_gem ? "✦ " : "") + p.name,
        p.type,
        String(p.compatibility_score),
        p.top_factors.map(f => `${f.direction === "positive" ? "+" : "−"} ${f.label}`).join("   "),
      ]),
      styles: { fontSize: 8.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 }, lineColor: [230, 232, 227], lineWidth: 0.15 },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      columnStyles: {
        0: { cellWidth: 8, halign: "center", textColor: LGRAY },
        1: { cellWidth: 34, fontStyle: "bold" },
        2: { cellWidth: 22, textColor: GRAY },
        3: { cellWidth: 16, halign: "center", fontStyle: "bold", textColor: GREEN },
        4: { textColor: GRAY },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          if (data.row.index === 0) {
            data.cell.styles.fillColor = TINT;
          }
          if (data.column.index === 1 && gemFlags[data.row.index]) {
            data.cell.styles.textColor = GEM;
          }
        }
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...LGRAY);
        doc.text(
          "Generated by Plearn — scores 936 plant varieties against your exact location, light, and climate zone.",
          margin, pageHeight - 10
        );
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth - margin, pageHeight - 10, { align: "right" }
        );
      },
    });

    const filename = `plearn-analysis-${conditions?.city?.toLowerCase().replace(/\s+/g, "-") ?? "results"}.pdf`;
    doc.save(filename);
  }

  return (
    <>
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; margin: 0; background: #ffffff; }

        button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible {
          outline: 2px solid #2D5A3D;
          outline-offset: 2px;
          border-radius: 6px;
        }

      `}</style>

      {/* ── NAV ── */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[1040px]">
        <div className="rounded-[28px] border bg-white/90 backdrop-blur-xl border-black/[0.07]">
          <div className="h-14 flex items-center justify-between px-5">
            <Link href="/" className="shrink-0">
              <Image src="/plearnlogo.png" alt="Plearn" width={92} height={20} />
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/catalog"
                className="text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-3.5 py-2 rounded-full transition-colors">
                Plant catalog
              </Link>
              <button onClick={() => router.push("/analyse")}
                className="flex items-center gap-1.5 text-[13px] font-medium text-[#4B5563] hover:text-[#111811] hover:bg-black/[0.03] px-3.5 py-2 rounded-full transition-colors">
                <ArrowLeft size={14} />
                New analysis
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-white">
        <div className="max-w-[1200px] mx-auto px-6">

          {/* ── HEADER ── */}
          <motion.div className="pt-24 pb-10"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}>

            {/* Conditions */}
            {condParts.length > 0 && (
              <div className="flex items-center gap-2 mb-5 pt-8">
                {condParts.map((p, i) => (
                  <span key={p} className="flex items-center gap-2">
                    <span className="text-[12px] text-[#6B7280] font-medium capitalize">{p}</span>
                    {i < condParts.length - 1 && <span className="text-[#D1D5DB] text-[10px]">·</span>}
                  </span>
                ))}
                <button onClick={openEditConditions}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#2D5A3D] hover:text-[#244930] transition-colors ml-1">
                  <Pencil size={11} /> Edit
                </button>
                <span className="text-[#D1D5DB] text-[10px]">·</span>
                <button onClick={() => setShowLegend(s => !s)}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#6B7280] hover:text-[#111811] transition-colors">
                  <Info size={11} /> What do these mean?
                  <ChevronDown size={12} className="transition-transform" style={{ transform: showLegend ? "rotate(180deg)" : "none" }} />
                </button>
              </div>
            )}

            {/* Legend */}
            <AnimatePresence>
              {showLegend && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.24 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5" style={{ background: "#F7F8F5", borderColor: "#E4E7E1" }}>
                    {[
                      { icon: <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#2D5A3D" }} /><Gauge size={13} color="#2D5A3D" /></span>, text: "Dot next to a score, or the gauge icon with \"± X\" in the full breakdown — the score's consistency (from running the model ~15 times and checking how much the answer moves around). A small ± means this plant and your conditions are a well-covered combination; a larger one just means it's a less common combination, worth a quick gut-check alongside the score." },
                      { icon: <Sparkles size={13} color="#6B48C8" />, text: "Sparkle / \"Hidden gem\" — scores well but sits outside the usual cluster for your conditions, so standard advice would miss it." },
                      { icon: <ArrowUp size={13} color="#2D5A3D" />, text: "Green ↑ chip under a score — a specific reason the model scored it up (e.g. drought tolerance)." },
                      { icon: <ArrowDown size={13} color="#B23B3B" />, text: "Red ↓ chip — a specific reason the model scored it down." },
                      { icon: <Heart size={13} color="#E0556B" />, text: "Heart — save a plant to the \"Saved\" tab, kept across sessions." },
                      { icon: <Shuffle size={13} color="#C87B4A" />, text: "\"Diverse set\" tab — one strong option per botanical cluster, not just the top scores overall." },
                      { icon: <Info size={13} color="#9CA3AF" />, text: "Small (i) next to a breakdown row — tap it for a one-line explanation of what feeds that number." },
                      { icon: <Columns2 size={13} color="#2D5A3D" />, text: "Compare — pick 2–3 plants to see their full breakdowns side by side." },
                      { icon: <Replace size={13} color="#2D5A3D" />, text: "\"Botanical substitutes\" in the full breakdown — the closest alternatives from the same botanical cluster, in case this exact plant is hard to find or you want to see what else is similar." },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0">{item.icon}</span>
                        <span className="text-[12px] text-[#6B7280] leading-relaxed">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline edit conditions panel */}
            <AnimatePresence>
              {editingConditions && editDraft && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.24 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 rounded-2xl border space-y-4" style={{ background: "#F7F8F5", borderColor: "#E4E7E1" }}>
                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase font-[Sora] mb-1.5 block">City</label>
                      <input
                        type="text"
                        value={editDraft.city}
                        onChange={e => setEditDraft({ ...editDraft, city: e.target.value })}
                        className="w-full max-w-[240px] px-3 py-2 rounded-lg border text-[13px] outline-none focus:border-[#2D5A3D] transition-colors bg-white"
                        style={{ borderColor: "#E4E7E1" }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase font-[Sora] mb-1.5 block">Space</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EDIT_SPACE_OPTIONS.map(o => (
                          <button key={o.value} onClick={() => setEditDraft({ ...editDraft, space: o.value })}
                            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                            style={editDraft.space === o.value
                              ? { color: "#2D5A3D", background: "#EEF7F1", borderColor: "#EEF7F1" }
                              : { color: "#6B7280", background: "white", borderColor: "#E4E7E1" }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase font-[Sora] mb-1.5 block">Sunlight</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EDIT_LIGHT_OPTIONS.map(o => (
                          <button key={o.value} onClick={() => setEditDraft({ ...editDraft, light: o.value })}
                            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                            style={editDraft.light === o.value
                              ? { color: "#2D5A3D", background: "#EEF7F1", borderColor: "#EEF7F1" }
                              : { color: "#6B7280", background: "white", borderColor: "#E4E7E1" }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase font-[Sora] mb-1.5 block">Experience</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EDIT_EXPERIENCE_OPTIONS.map(o => (
                          <button key={o.value} onClick={() => setEditDraft({ ...editDraft, experience: o.value })}
                            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                            style={editDraft.experience === o.value
                              ? { color: "#2D5A3D", background: "#EEF7F1", borderColor: "#EEF7F1" }
                              : { color: "#6B7280", background: "white", borderColor: "#E4E7E1" }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.08em] uppercase font-[Sora] mb-1.5 block">Preferences</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EDIT_PREF_OPTIONS.map(o => (
                          <button key={o.key}
                            onClick={() => setEditDraft({
                              ...editDraft,
                              preferences: { ...editDraft.preferences, [o.key]: !editDraft.preferences[o.key] },
                            })}
                            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                            style={editDraft.preferences[o.key]
                              ? { color: "#2D5A3D", background: "#EEF7F1", borderColor: "#EEF7F1" }
                              : { color: "#6B7280", background: "white", borderColor: "#E4E7E1" }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button onClick={applyEditedConditions} disabled={reanalyzing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold font-[Sora] text-white transition-all disabled:opacity-60"
                        style={{ background: "#2D5A3D" }}>
                        {reanalyzing ? <Loader2 size={14} className="animate-spin" /> : null}
                        {reanalyzing ? "Re-analysing…" : "Apply changes"}
                      </button>
                      <button onClick={() => setEditingConditions(false)} disabled={reanalyzing}
                        className="text-[13px] font-medium text-[#6B7280] hover:text-[#111811] transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Headline */}
            <h1 className="font-[Sora] font-extrabold text-[#111811] tracking-[-0.04em] leading-[1.08] mb-3"
              style={{ fontSize: "clamp(26px, 4.5vw, 44px)" }}>
              {results.total_evaluated} plants evaluated.{" "}
              <span style={{ color: "#2D5A3D" }}>{results.plants.length} matched.</span>
            </h1>

            {/* Weather */}
            <div className="flex items-center gap-5 flex-wrap">
              <span className="flex items-center gap-1.5 text-[12.5px] text-[#6B7280]">
                <Thermometer size={13} />
                {results.weather.temperature}°C · {results.weather.city}
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-[#6B7280]">
                <Sun size={13} />
                UV {results.weather.uv_index}
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-[#6B7280] capitalize">
                <WeatherIcon description={results.weather.description} />
                {results.weather.description}
              </span>
              {results.weather.adjustment_note && (
                <span className="text-[12.5px] text-[#2D5A3D] italic">{results.weather.adjustment_note}</span>
              )}
            </div>
          </motion.div>

          {/* ── TABS ── */}
          <motion.div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-[#F7F8F5] w-fit"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.12 }}>
            {([
              { key: "all"     as Tab, label: "All results",    count: applyFilters(results.plants, activeFilters).length },
              { key: "gems"    as Tab, label: "Hidden gems ✦",  count: applyFilters(results.hidden_gems, activeFilters).length },
              { key: "diverse" as Tab, label: "Diverse set",    count: applyFilters(results.diverse_set, activeFilters).length },
              { key: "saved"   as Tab, label: "Saved",          count: applyFilters(favorites, activeFilters).length },
            ]).map(t => (
              <button key={t.key} onClick={() => switchTab(t.key)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold font-[Sora] transition-colors"
                style={{ color: tab === t.key ? "white" : "#6B7280" }}>
                {tab === t.key && (
                  <motion.div layoutId="tab-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{ background:
                      t.key === "gems" ? "#6B48C8" :
                      t.key === "diverse" ? "#C87B4A" :
                      t.key === "saved" ? "#E0556B" : "#2D5A3D" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10">{t.label}</span>
                <span className={`relative z-10 text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-white/20" : "bg-[#E4E7E1] text-[#6B7280]"
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </motion.div>

          {/* ── SORT + FILTERS ── */}
          <motion.div className="flex items-center justify-between flex-wrap gap-3 mb-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.16 }}>
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
              <button
                onClick={() => { setCompareMode(m => !m); setCompareSelection([]); }}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors"
                style={compareMode
                  ? { color: "#2D5A3D", background: "#EEF7F1", borderColor: "#EEF7F1" }
                  : { color: "#6B7280", background: "white", borderColor: "#E4E7E1" }}>
                <Columns2 size={13} />
                {compareMode ? "Cancel compare" : "Compare"}
              </button>
              <button
                onClick={() => downloadAnalysisPDF()}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors text-[#6B7280] bg-white hover:text-[#111811]"
                style={{ borderColor: "#E4E7E1" }}>
                <Download size={13} />
                Download my analysis
              </button>
            </div>

            <Dropdown value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
          </motion.div>

          {/* ── GEMS EXPLAINER ── */}
          <AnimatePresence>
            {tab === "gems" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.24 }} className="overflow-hidden">
                <div className="p-4 rounded-2xl border" style={{ background: "#F5F4FF", borderColor: "#D4CEEF" }}>
                  <div className="flex items-start gap-3">
                    <Sparkles size={20} color="#6B48C8" className="shrink-0" />
                    <div>
                      <div className="font-[Sora] text-[13px] font-bold text-[#6B48C8] mb-1">What are hidden gems?</div>
                      <p className="text-[12.5px] text-[#6B7280] leading-relaxed">
                        Plants that scored unexpectedly high for your conditions but sit outside your typical zone cluster.
                        The anomaly detection layer surfaced what standard advice would never recommend.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── DIVERSE SET EXPLAINER ── */}
          <AnimatePresence>
            {tab === "diverse" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.24 }} className="overflow-hidden">
                <div className="p-4 rounded-2xl border" style={{ background: "#FDF3EC", borderColor: "#E9C7A8" }}>
                  <div className="flex items-start gap-3">
                    <Shuffle size={20} color="#C87B4A" className="shrink-0" />
                    <div>
                      <div className="font-[Sora] text-[13px] font-bold text-[#C87B4A] mb-1">What&apos;s a diverse set?</div>
                      <p className="text-[12.5px] text-[#6B7280] leading-relaxed">
                        The strongest plant from each distinct botanical cluster in your results, not just the top
                        scores overall — which tend to bunch up in one plant family. A real spread for a starter garden.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MAIN GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start mb-5">

            {/* Plant list */}
            <motion.div key={tab} className="space-y-2"
              variants={listContainer} initial="hidden" animate="visible">
              {displayPlants.length === 0 && (
                <motion.div variants={listItem} className="py-20 text-center text-[14px] text-[#9CA3AF]">
                  {activeFilters.length > 0
                    ? <>No results match {activeFilters.join(" + ")}. <button onClick={clearFilters} className="underline hover:text-[#111811]">Clear filters</button></>
                    : tab === "saved"
                    ? "Nothing saved yet — tap the heart on any plant to keep it here."
                    : tab === "diverse"
                    ? "Not enough distinct clusters in this result set to build a diverse set."
                    : `No ${tab === "gems" ? "hidden gems" : "results"} found for these conditions.`}
                </motion.div>
              )}
              {displayPlants.map((plant, i) => (
                <motion.div key={plant.id ?? plant.name} variants={listItem}>
                  <PlantCard
                    plant={plant}
                    rank={tab === "all" ? i + 1 : undefined}
                    selected={selected?.name === plant.name}
                    tags={activeFilters.length > 0
                      ? activeFilters
                      : [highlightTag(plant, displayPlants)].filter((t): t is string => t !== null)}
                    isFavorite={isFavorited(plant)}
                    onToggleFavorite={() => toggleFavorite(plant)}
                    compareMode={compareMode}
                    compareSelected={compareSelection.some(p => p.id === plant.id && p.name === plant.name)}
                    onToggleCompare={() => toggleCompare(plant)}
                    onSelect={() => {
                      setSelected(plant);
                      setMobileOpen(mobileOpen === plant.name ? null : plant.name);
                    }}
                  />
                  {/* Mobile: inline accordion */}
                  <AnimatePresence>
                    {mobileOpen === plant.name && (
                      <motion.div className="lg:hidden mt-2 overflow-hidden"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.26, ease }}>
                        <BreakdownPanel plant={plant} onClose={() => setMobileOpen(null)}
                          isFavorite={isFavorited(plant)} onToggleFavorite={() => toggleFavorite(plant)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>

            {/* Desktop breakdown — always visible, auto-selected */}
            <div className="hidden lg:block sticky top-6">
              <AnimatePresence mode="wait">
                {selected && (
                  <motion.div key={selected.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.22, ease }}>
                    <BreakdownPanel plant={selected}
                      isFavorite={isFavorited(selected)} onToggleFavorite={() => toggleFavorite(selected)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Care requirements — its own full-width, prominent section, not tucked under the score panel */}
          {selected && (
            <div className="pb-16">
              <AnimatePresence mode="wait">
                <motion.div key={selected.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.22, ease }}>
                  <CareRequirementsPanel plant={selected} />
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Floating compare bar */}
          <AnimatePresence>
            {compareMode && compareSelection.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
              >
                <button onClick={() => setCompareModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-semibold font-[Sora] text-white shadow-[0_12px_32px_rgba(45,90,61,0.3)]"
                  style={{ background: "#2D5A3D" }}>
                  <Columns2 size={16} />
                  Compare {compareSelection.length} plants <ArrowRight size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {compareModalOpen && (
              <CompareModal
                plants={compareSelection}
                onClose={() => setCompareModalOpen(false)}
                onRemove={plant => {
                  const next = compareSelection.filter(p => !(p.id === plant.id && p.name === plant.name));
                  setCompareSelection(next);
                  if (next.length < 2) setCompareModalOpen(false);
                }}
              />
            )}
          </AnimatePresence>

          {/* ── CTA ── */}
          <div className="border-t py-12 text-center" style={{ borderColor: "#F0F2EE" }}>
            <p className="text-[13px] text-[#9CA3AF] mb-4">Want to try different conditions?</p>
            <button onClick={() => router.push("/analyse")}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-semibold font-[Sora] border-2 text-[#111811] hover:bg-[#F7F8F5] transition-all"
              style={{ borderColor: "#E4E7E1" }}>
              Run a new analysis <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

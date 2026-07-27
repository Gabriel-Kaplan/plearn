// lib/types.ts — shared types across the Plearn frontend

export interface UserConditions {
  city: string;                  // e.g. "Tel Aviv"
  light: "full_sun" | "partial_shade" | "full_shade";
  space: "balcony" | "windowsill" | "garden" | "indoor";
  experience: "beginner" | "intermediate" | "expert";
  preferences: {
    edible: boolean;
    pet_safe: boolean;
    drought_resistant: boolean;
    low_maintenance: boolean;
  };
}

export interface ScoreBreakdown {
  climate_match: number;   // 0-100
  space_score: number;     // 0-100
  beginner_ease: number;   // 0-100
  safety_score: number;    // 0-100
  drought_score: number;   // 0-100
}

// MC Dropout runs inference N times with dropout left active; the spread
// across runs (score_confidence) is a real uncertainty signal — small means
// the model is stable on this input, large means it's effectively guessing.
export interface ScoreFactor {
  label: string;
  direction: "positive" | "negative";
}

// Collected in the original bulk data pull, present for all 936 plants —
// served directly from our own dataset rather than a live third-party call,
// so it's instant and never subject to an API provider's subscription tier.
export interface PlantCare {
  watering: string;
  watering_days: number;
  sunlight: string;
  care_level: string;
  cycle: string;
  maintenance: string;
  growth_rate: string;
  drought_tolerant: boolean;
  indoor: boolean;
}

export interface Plant {
  id: number;
  name: string;
  scientific_name?: string;
  type: string;             // e.g. "Succulent", "Herb"
  compatibility_score: number;
  score_confidence: number; // std across MC Dropout samples — lower is more certain
  breakdown: ScoreBreakdown;
  tags: string[];           // e.g. ["Pet safe", "Low water"]
  is_hidden_gem: boolean;
  image_url?: string;
  care_summary?: string;
  care: PlantCare;
  top_factors: ScoreFactor[];
}

// Botanical substitutes are fetched lazily per-plant from /api/similar/[name]
// (same KMeans cluster, ranked by overall_home_score) — not part of the
// initial /recommend response.
export interface Substitute {
  id: number;
  name: string;
  type: string;
  score: number;
  image_url?: string;
}

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  uv_index: number;
  description: string;
  adjustment_note?: string;  // e.g. "Scores adjusted for current heatwave"
}

export interface RecommendResponse {
  plants: Plant[];
  hidden_gems: Plant[];
  diverse_set: Plant[];
  weather: WeatherData;
  total_evaluated: number;
  zone: string;
}
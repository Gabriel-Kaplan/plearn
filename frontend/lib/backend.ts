// lib/backend.ts — shared FastAPI <-> frontend mapping, used by the
// /api/recommend, /api/plants, and /api/score-plant routes so they don't each
// duplicate the same plant-shape translation.

export const FASTAPI = process.env.FASTAPI_URL ?? "http://localhost:8000";

export type FrontendConditions = {
  city: string;
  light: string;
  space: string;
  experience: string;
  preferences: Record<string, boolean>;
};

export type BackendFactor = { label: string; direction: "positive" | "negative" };

export type BackendPlant = {
  id: number;
  common_name: string;
  type: string;
  predicted_score: number;
  score_std: number;
  beginner_score: number;
  climate_score: number;
  space_score: number;
  safety_score: number;
  drought_score: number;
  edibility_score: number;
  is_edible: number;
  is_pet_safe: number;
  is_indoor_suitable: number;
  is_low_maintenance: number;
  image_url: string | null;
  cluster: number;
  top_factors: BackendFactor[];
};

const CITY_TO_LOCATION: Record<string, string> = {
  "tel aviv": "tel_aviv",
  jerusalem: "jerusalem",
  haifa: "haifa",
  "be'er sheva": "beer_sheva",
  "beer sheva": "beer_sheva",
  eilat: "south",
  netanya: "tel_aviv",
  "ra'anana": "tel_aviv",
  raanana: "tel_aviv",
  herzliya: "tel_aviv",
  rehovot: "tel_aviv",
  ashdod: "south",
  ashkelon: "south",
  tiberias: "north",
  nazareth: "north",
  "kfar saba": "tel_aviv",
  "petah tikva": "tel_aviv",
};

export function normalizeLocation(city: string) {
  return CITY_TO_LOCATION[city.trim().toLowerCase()] ?? "tel_aviv";
}

export function toBackendPayload(body: FrontendConditions) {
  return {
    experience: body.experience === "expert" ? "intermediate" : body.experience,
    location: normalizeLocation(body.city),
    space: body.space,
    sunlight: body.light,
    preferences: Object.entries(body.preferences ?? {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key),
  };
}

function tagsForPlant(plant: BackendPlant) {
  return [
    plant.is_pet_safe ? "Pet safe" : null,
    plant.is_edible ? "Edible" : null,
    plant.is_indoor_suitable ? "Indoor suitable" : null,
    plant.is_low_maintenance ? "Low maintenance" : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function score(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toFrontendPlant(plant: BackendPlant, isHiddenGem = false) {
  return {
    id: plant.id,
    name: plant.common_name,
    type: plant.type,
    compatibility_score: score(plant.predicted_score),
    score_confidence: Math.round((plant.score_std ?? 0) * 10) / 10,
    breakdown: {
      climate_match: score(plant.climate_score),
      space_score: score(plant.space_score),
      beginner_ease: score(plant.beginner_score),
      safety_score: score(plant.safety_score),
      drought_score: score(plant.drought_score),
    },
    tags: tagsForPlant(plant),
    is_hidden_gem: isHiddenGem,
    image_url: plant.image_url ?? undefined,
    top_factors: plant.top_factors ?? [],
    care_summary: [
      `Climate fit: ${score(plant.climate_score)}/100.`,
      `Space fit: ${score(plant.space_score)}/100.`,
      plant.is_low_maintenance ? "Low maintenance." : null,
    ].filter(Boolean).join(" "),
  };
}

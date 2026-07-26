import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.PERENUAL_API_KEY ?? "";

type PerenualSpecies = {
  id: number;
  common_name: string;
  watering: string;
  sunlight: string[] | string;
  care_level: string | null;
  cycle: string | null;
  maintenance: string | null;
  growth_rate: string | null;
  drought_tolerant: boolean;
  indoor: boolean;
  default_image?: { small_url?: string } | null;
};

type PerenualListResponse = {
  data: PerenualSpecies[];
};

export type PlantCareData = {
  watering: string;
  sunlight: string[];
  care_level: string | null;
  cycle: string | null;
  maintenance: string | null;
  growth_rate: string | null;
  drought_tolerant: boolean;
  indoor: boolean;
};

const cache = new Map<string, PlantCareData | null>();

async function fetchCare(name: string): Promise<PlantCareData | null> {
  const url = `https://perenual.com/api/species-list?key=${KEY}&q=${encodeURIComponent(name)}&per_page=1`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const json = (await res.json()) as PerenualListResponse;
  const plant = json.data?.[0];
  if (!plant) return null;
  return {
    watering:        plant.watering,
    sunlight:        Array.isArray(plant.sunlight) ? plant.sunlight : (plant.sunlight ? [plant.sunlight] : []),
    care_level:      plant.care_level ?? null,
    cycle:           plant.cycle ?? null,
    maintenance:     plant.maintenance ?? null,
    growth_rate:     plant.growth_rate ?? null,
    drought_tolerant: plant.drought_tolerant ?? false,
    indoor:          plant.indoor ?? false,
  };
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!KEY)  return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  if (cache.has(name)) {
    return NextResponse.json(cache.get(name));
  }

  try {
    const data = await fetchCare(name);
    cache.set(name, data);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null);
  }
}

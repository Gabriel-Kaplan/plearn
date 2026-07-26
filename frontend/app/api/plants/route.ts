import { NextResponse } from "next/server";
import { FASTAPI } from "@/lib/backend";

type RawCatalogPlant = {
  id: number;
  common_name: string;
  type: string;
  overall_home_score: number;
  cluster: number;
  is_edible: number;
  is_pet_safe: number;
  is_indoor_suitable: number;
  is_low_maintenance: number;
  image_url: string | null;
};

function tagsFor(p: RawCatalogPlant) {
  return [
    p.is_pet_safe ? "Pet safe" : null,
    p.is_edible ? "Edible" : null,
    p.is_indoor_suitable ? "Indoor suitable" : null,
    p.is_low_maintenance ? "Low maintenance" : null,
  ].filter((t): t is string => Boolean(t));
}

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI}/plants?limit=1000`);
    if (!res.ok) return NextResponse.json({ error: "Failed to load catalog" }, { status: res.status });
    const raw = (await res.json()) as RawCatalogPlant[];
    const plants = raw.map(p => ({
      id: p.id,
      name: p.common_name,
      type: p.type,
      score: Math.round(p.overall_home_score),
      cluster: p.cluster,
      image_url: p.image_url ?? undefined,
      tags: tagsFor(p),
    }));
    return NextResponse.json({ plants });
  } catch {
    return NextResponse.json({ error: "Failed to reach backend" }, { status: 500 });
  }
}

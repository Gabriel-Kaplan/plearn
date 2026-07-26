import { NextRequest, NextResponse } from "next/server";
import {
  FASTAPI, toBackendPayload, toFrontendPlant,
  type FrontendConditions, type BackendPlant,
} from "@/lib/backend";

type BackendRecommendResponse = {
  total_plants_evaluated: number;
  plants_after_filtering: number;
  top_recommendations: BackendPlant[];
  hidden_gems: BackendPlant[];
  diverse_set: BackendPlant[];
  profile_used: string;
};

type WeatherResponse = {
  city: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  uv_index: number;
  description: string;
  adjustment_note?: string;
};

function cityWeatherFallback(city: string) {
  return {
    city,
    temperature: 28,
    humidity: 55,
    rainfall: 0,
    uv_index: 8,
    description: "Estimated local conditions",
    adjustment_note: "Weather API is not connected yet, so scores use the trained plant model.",
  };
}

async function fetchWeather(city: string): Promise<WeatherResponse> {
  try {
    const res = await fetch(`${FASTAPI}/weather/${encodeURIComponent(city)}`);
    if (!res.ok) return cityWeatherFallback(city);
    return await res.json();
  } catch {
    return cityWeatherFallback(city);
  }
}

async function toFrontendResponse(data: BackendRecommendResponse, body: FrontendConditions) {
  const plants = data.top_recommendations.map((plant) => toFrontendPlant(plant));
  const hiddenGemPlants = data.hidden_gems.map((plant) => toFrontendPlant(plant, true));
  const diverseSet = data.diverse_set.map((plant) => toFrontendPlant(plant));
  const weather = await fetchWeather(body.city);

  return {
    plants,
    hidden_gems: hiddenGemPlants,
    diverse_set: diverseSet,
    weather,
    total_evaluated: data.total_plants_evaluated,
    zone: toBackendPayload(body).location,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FrontendConditions;
    const backendPayload = toBackendPayload(body);
    const res = await fetch(`${FASTAPI}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    const data = (await res.json()) as BackendRecommendResponse;
    return NextResponse.json(await toFrontendResponse(data, body));
  } catch {
    return NextResponse.json({ error: "Failed to reach backend" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const FASTAPI = process.env.FASTAPI_URL ?? "http://localhost:8000";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const res = await fetch(`${FASTAPI}/weather/${encodeURIComponent(city)}`);
  const data = await res.json();
  return NextResponse.json(data);
}

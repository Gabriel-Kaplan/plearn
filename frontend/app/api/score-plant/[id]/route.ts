import { NextRequest, NextResponse } from "next/server";
import { FASTAPI, toBackendPayload, toFrontendPlant, type FrontendConditions, type BackendPlant } from "@/lib/backend";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as FrontendConditions;
    const backendPayload = toBackendPayload(body);
    const res = await fetch(`${FASTAPI}/score-plant/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    const data = (await res.json()) as BackendPlant;
    return NextResponse.json(toFrontendPlant(data));
  } catch {
    return NextResponse.json({ error: "Failed to reach backend" }, { status: 500 });
  }
}

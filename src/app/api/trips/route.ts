import { NextResponse } from "next/server";
import { getAllTrips } from "@/lib/store";

export async function GET() {
  try {
    const trips = await getAllTrips(200);
    return NextResponse.json({ data: trips });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

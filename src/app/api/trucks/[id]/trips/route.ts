import { NextResponse } from "next/server";
import { getTripsByTruck, getTripPositions } from "@/lib/store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");

    if (tripId) {
      const positions = await getTripPositions(Number(tripId));
      return NextResponse.json({ data: positions });
    }

    const trips = await getTripsByTruck(id, 30);
    return NextResponse.json({ data: trips });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

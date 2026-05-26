import { NextResponse } from "next/server";
import { getAllVehicles, addVehicle } from "@/lib/store";

export async function GET() {
  try {
    const vehicles = await getAllVehicles();
    return NextResponse.json({ data: vehicles });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, plate, model, year, route, fuel_capacity, status } = body;

    if (!id || !name || !plate) {
      return NextResponse.json(
        { error: "id, name, and plate are required." },
        { status: 400 }
      );
    }

    const vehicle = await addVehicle({
      id,
      name,
      plate,
      model:         model        ?? "",
      year:          year         ?? "",
      route:         route        ?? "",
      fuel_capacity: Number(fuel_capacity ?? 400),
      status:        status       ?? "idle",
    });

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("duplicate") || msg.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

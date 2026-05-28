import { NextResponse } from "next/server";
import {
  getAllTrucks,
  addTruck,
  getFleetSummary,
} from "@/lib/store";
import {
  validateTruck,
  validateTruckFilters,
  errorEnvelope,
  successEnvelope,
} from "@/lib/validators";
import type { Truck } from "@/data/trucks";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawFilters: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) rawFilters[k] = v;

    const { valid, errors } = validateTruckFilters(rawFilters);
    if (!valid) {
      return NextResponse.json(errorEnvelope(400, "Invalid query parameters.", errors), { status: 400 });
    }

    const filters = {
      status:  rawFilters.status,
      minFuel: rawFilters.minFuel  !== undefined ? Number(rawFilters.minFuel)  : undefined,
      maxFuel: rawFilters.maxFuel  !== undefined ? Number(rawFilters.maxFuel)  : undefined,
      limit:   rawFilters.limit   !== undefined ? Number(rawFilters.limit)   : 50,
      offset:  rawFilters.offset  !== undefined ? Number(rawFilters.offset)  : 0,
    };

    const [{ data: page, total }, summary] = await Promise.all([
      getAllTrucks(filters),
      getFleetSummary(),
    ]);

    return NextResponse.json(
      successEnvelope(page, {
        total,
        offset: filters.offset,
        limit:  filters.limit,
        returned: page.length,
        summary,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/trucks]", err);
    return NextResponse.json(errorEnvelope(500, "Internal server error.", [(err as Error).message]), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        errorEnvelope(400, "Request body must be valid JSON.", ["Could not parse JSON body."]),
        { status: 400 }
      );
    }

    const { valid, errors } = validateTruck(body);
    if (!valid) {
      return NextResponse.json(errorEnvelope(422, "Payload validation failed.", errors), { status: 422 });
    }

    const b = body as Record<string, unknown>;
    const existing = await (async () => {
      try { return await import("@/lib/store").then(m => m.getTruckById(b.id as string)); }
      catch { return null; }
    })();

    if (existing) {
      return NextResponse.json(
        errorEnvelope(409, "Conflict: truck ID already exists.", [`Truck with id "${b.id}" already exists.`]),
        { status: 409 }
      );
    }

    const newTruck: Truck = {
      id:          b.id as string,
      name:        (b.name as string).trim(),
      driver:      (b.driver as string).trim(),
      plate:       (b.plate as string).trim(),
      model:       ((b.model as string | undefined) ?? "").trim(),
      year:        Number(b.year),
      status:      b.status as string,
      fuel:        Number(b.fuel),
      speed:       Number(b.speed),
      odometer:    Number(b.odometer),
      lat:         Number(b.lat),
      lng:         Number(b.lng),
      route:       ((b.route as string | undefined) ?? "").trim(),
      lastService:  b.lastService as string,
      nextService:  b.nextService as string,
      vehicle_type: (b.vehicle_type as "truck" | "bus" | "car" | "trailer") ?? "truck",
    };

    const saved = await addTruck(newTruck);
    return NextResponse.json(successEnvelope(saved, { message: "Truck created successfully." }), { status: 201 });
  } catch (err) {
    console.error("[POST /api/trucks]", err);
    return NextResponse.json(errorEnvelope(500, "Internal server error.", [(err as Error).message]), { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  getTruckById,
  updateTruckById,
  deleteTruckById,
} from "@/lib/store";
import { validateTruck, errorEnvelope, successEnvelope } from "@/lib/validators";
import type { Truck } from "@/data/trucks";

function resolveId(id: string | undefined) {
  if (!id || typeof id !== "string" || !/^TRK-\d{3,}$/.test(id)) {
    return { id: null, error: `Invalid truck ID format: "${id}". Expected TRK-NNN.` };
  }
  return { id, error: null };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  try {
    const { id, error } = resolveId(rawId);
    if (error || !id) {
      return NextResponse.json(errorEnvelope(400, "Invalid truck ID.", [error ?? ""]), { status: 400 });
    }

    const truck = await getTruckById(id);
    if (!truck) {
      return NextResponse.json(
        errorEnvelope(404, "Truck not found.", [`No truck with id "${id}" exists.`]),
        { status: 404 }
      );
    }

    const now = new Date();
    const enriched = {
      ...truck,
      _derived: {
        isOverdue:       new Date(`${truck.nextService}T00:00:00`) < now,
        fuelLiters:      Math.round(truck.fuel * 4),
        tankCapacity:    400,
        estimatedRange:  Math.round((truck.fuel * 4 * 100) / 38),
        isSpeedingAlert: truck.speed > 100,
      },
    };

    return NextResponse.json(successEnvelope(enriched), { status: 200 });
  } catch (err) {
    console.error(`[GET /api/trucks/${rawId}]`, err);
    return NextResponse.json(errorEnvelope(500, "Internal server error.", [(err as Error).message]), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  try {
    const { id, error: idError } = resolveId(rawId);
    if (idError || !id) {
      return NextResponse.json(errorEnvelope(400, "Invalid truck ID.", [idError ?? ""]), { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        errorEnvelope(400, "Request body must be valid JSON.", ["Could not parse JSON body."]),
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    if (b.id && b.id !== id) {
      return NextResponse.json(
        errorEnvelope(400, "Cannot change truck ID.", ['Field "id" cannot be modified via PATCH.']),
        { status: 400 }
      );
    }

    const { valid, errors } = validateTruck(body, { partial: true });
    if (!valid) {
      return NextResponse.json(errorEnvelope(422, "Payload validation failed.", errors), { status: 422 });
    }

    const existing = await getTruckById(id);
    if (!existing) {
      return NextResponse.json(
        errorEnvelope(404, "Truck not found.", [`No truck with id "${id}" exists.`]),
        { status: 404 }
      );
    }

    const { id: _ignored, ...safeBody } = b;
    const updated = await updateTruckById(id, safeBody as Partial<Truck>);
    return NextResponse.json(successEnvelope(updated, { message: "Truck updated successfully." }), { status: 200 });
  } catch (err) {
    console.error(`[PATCH /api/trucks/${rawId}]`, err);
    return NextResponse.json(errorEnvelope(500, "Internal server error.", [(err as Error).message]), { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  try {
    const { id, error } = resolveId(rawId);
    if (error || !id) {
      return NextResponse.json(errorEnvelope(400, "Invalid truck ID.", [error ?? ""]), { status: 400 });
    }

    const existing = await getTruckById(id);
    if (!existing) {
      return NextResponse.json(
        errorEnvelope(404, "Truck not found.", [`No truck with id "${id}" exists.`]),
        { status: 404 }
      );
    }

    await deleteTruckById(id);
    return NextResponse.json(successEnvelope(null, { message: `Truck "${id}" deleted successfully.` }), { status: 200 });
  } catch (err) {
    console.error(`[DELETE /api/trucks/${rawId}]`, err);
    return NextResponse.json(errorEnvelope(500, "Internal server error.", [(err as Error).message]), { status: 500 });
  }
}

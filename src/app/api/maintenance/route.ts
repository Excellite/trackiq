import { NextResponse } from "next/server";
import { getAllMaintenance, getMaintenanceByTruck, addMaintenanceRecord } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const truckId = searchParams.get("truck_id");
  try {
    const data = truckId
      ? await getMaintenanceByTruck(truckId)
      : await getAllMaintenance();
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { truck_id, service_type, performed_at, next_due_at, odometer_km, cost_ngn, technician, notes } = body;
    if (!truck_id || !service_type || !performed_at) {
      return NextResponse.json({ error: "truck_id, service_type and performed_at are required." }, { status: 400 });
    }
    const record = await addMaintenanceRecord({ truck_id, service_type, performed_at, next_due_at, odometer_km, cost_ngn, technician, notes });

    // Keep trucks table in sync
    const truckPatch: Record<string, unknown> = { lastService: performed_at };
    if (next_due_at) truckPatch.nextService = next_due_at;
    await supabase.from("trucks").update(truckPatch).eq("id", truck_id);

    // Only advance odometer — never go backwards
    if (odometer_km) {
      await supabase.from("trucks").update({ odometer: odometer_km }).eq("id", truck_id).lt("odometer", odometer_km);
    }

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

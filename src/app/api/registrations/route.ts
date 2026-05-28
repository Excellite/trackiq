import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { addVehicleSchema } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = addVehicleSchema.safeParse(body.vehicle ?? body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const d    = parsed.data;
    const today     = new Date().toISOString().split("T")[0];
    const sixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 1 — Save vehicle to trucks table
    const { error: truckErr } = await supabase.from("trucks").upsert({
      id:           d.fleetId,
      name:         d.vehicleName,
      driver:       "",
      plate:        d.plate,
      model:        `${d.make} ${d.model}`,
      year:         d.year,
      status:       "idle",
      fuel:         100,
      speed:        0,
      odometer:     0,
      lat:          d.locationLat ? parseFloat(d.locationLat) : 6.465,
      lng:          d.locationLng ? parseFloat(d.locationLng) : 3.406,
      route:        d.route || "",
      lastService:  today,
      nextService:  sixMonths,
      vehicle_type: d.vehicleType,
    }, { onConflict: "id" });
    if (truckErr) throw new Error(truckErr.message);

    // 2 — Handle driver assignment
    const driver: { mode: string; existingId?: string; name?: string; phone?: string; license_no?: string } = body.driver ?? { mode: "none" };
    let driverName = "";

    if (driver.mode === "existing" && driver.existingId) {
      const { data: drv } = await supabase.from("drivers").select("name").eq("id", driver.existingId).single();
      if (drv) {
        driverName = (drv as { name: string }).name;
        await supabase.from("drivers").update({ assigned_truck_id: d.fleetId }).eq("id", driver.existingId);
        await supabase.from("trucks").update({ driver: driverName }).eq("id", d.fleetId);
      }
    } else if (driver.mode === "new" && driver.name) {
      driverName = driver.name;
      await supabase.from("drivers").insert({
        name:             driver.name,
        phone:            driver.phone ?? "",
        license_no:       driver.license_no ?? "",
        assigned_truck_id: d.fleetId,
      });
      await supabase.from("trucks").update({ driver: driverName }).eq("id", d.fleetId);
    }

    // 3 — Save documents
    const docs: Record<string, { doc_number: string; expiry_date: string }> = body.docs ?? {};
    const docEntries = Object.entries(docs).filter(([, v]) => v.expiry_date);
    if (docEntries.length > 0) {
      await supabase.from("vehicle_documents").insert(
        docEntries.map(([doc_type, v]) => ({
          truck_id:   d.fleetId,
          doc_type,
          doc_number: v.doc_number || null,
          expiry_date: v.expiry_date,
        }))
      );
    }

    return NextResponse.json({
      vehicle: {
        fleetId:     d.fleetId,
        vehicleName: d.vehicleName,
        plate:       d.plate,
        make:        d.make,
        model:       d.model,
        year:        d.year,
        vehicleType: d.vehicleType,
        fuelType:    d.fuelType,
        route:       d.route,
        driverName:  driverName || undefined,
        docsCount:   docEntries.length,
      },
    }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("duplicate") || msg.includes("unique") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

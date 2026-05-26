import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { vehicleRegistrationSchema } from "@/lib/schema";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vehicle_registrations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = vehicleRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const { data, error } = await supabase
      .from("vehicle_registrations")
      .insert({
        make:             d.make,
        model:            d.model,
        year:             d.year,
        vin:              d.vin,
        license_plate:    d.licensePlate,
        fuel_type:        d.fuelType,
        location_address: d.locationAddress,
        location_lat:     d.locationLat ?? "",
        location_lng:     d.locationLng ?? "",
        owner_name:       d.ownerName,
        owner_email:      d.ownerEmail,
        owner_phone:      d.ownerPhone,
        status:           "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ vehicle: { ...d, id: data.id, status: data.status, created_at: data.created_at } }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("duplicate") || msg.includes("unique") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

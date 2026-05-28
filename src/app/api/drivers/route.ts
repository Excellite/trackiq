import { NextResponse } from "next/server";
import { getDriversWithStats, addDriver } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const drivers = await getDriversWithStats();
    return NextResponse.json({ data: drivers });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, license_no, assigned_truck_id } = body;

    if (!name || !phone || !assigned_truck_id) {
      return NextResponse.json(
        { error: "name, phone, and assigned_truck_id are required." },
        { status: 400 }
      );
    }

    const driver = await addDriver({
      name,
      phone,
      license_no:        license_no        ?? "",
      assigned_truck_id,
    });

    // Keep trucks.driver in sync so the fleet list shows the driver name
    await supabase.from("trucks").update({ driver: name }).eq("id", assigned_truck_id);

    return NextResponse.json({ data: driver }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("violates foreign key") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

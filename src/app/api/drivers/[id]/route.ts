import { NextResponse } from "next/server";
import { reassignDriver } from "@/lib/store";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { assigned_truck_id } = body;

    await reassignDriver(id, assigned_truck_id ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

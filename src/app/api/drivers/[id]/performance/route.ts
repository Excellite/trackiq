import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: truckId } = await params;

    const [{ data: positions }, { data: trips }] = await Promise.all([
      supabase
        .from("truck_positions")
        .select("speed")
        .eq("truck_id", truckId),
      supabase
        .from("trips")
        .select("distance_km, started_at, ended_at, status")
        .eq("truck_id", truckId)
        .eq("status", "completed"),
    ]);

    const speedViolations = (positions ?? []).filter((p) => Number(p.speed) > 100).length;
    const totalTrips      = (trips ?? []).length;
    const totalKm         = (trips ?? []).reduce((a, t) => a + Number(t.distance_km ?? 0), 0);
    const avgKm           = totalTrips > 0 ? +(totalKm / totalTrips).toFixed(1) : 0;

    const allSpeeds = (positions ?? []).map((p) => Number(p.speed)).filter((s) => s > 0);
    const avgSpeed  = allSpeeds.length
      ? +(allSpeeds.reduce((a, s) => a + s, 0) / allSpeeds.length).toFixed(1)
      : 0;

    // Score: 100 − 5 per speeding event (floor 40)
    const score = Math.max(40, 100 - speedViolations * 5);

    const grade =
      score >= 90 ? "A" :
      score >= 80 ? "B" :
      score >= 70 ? "C" : "D";

    return NextResponse.json({
      data: { truck_id: truckId, speed_violations: speedViolations, total_trips: totalTrips, total_km: +totalKm.toFixed(1), avg_km: avgKm, avg_speed: avgSpeed, score, grade },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

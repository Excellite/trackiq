import { NextResponse } from "next/server";
import { updateTruckByImei } from "@/lib/store";

/**
 * Teltonika FMB920 GPS tracker webhook
 *
 * Configure in Teltonika Configurator:
 *   Server → Domain/IP : your-app.vercel.app
 *   Server → Port      : 443
 *   Server → Protocol  : HTTPS
 *   Server → URL       : /api/tracker?token=<TRACKER_SECRET>
 *   Data sending period: 30 s (or as needed)
 *
 * The FMB920 sends HTTP POST with JSON body:
 * {
 *   "imei"  : "123456789012345",   // device IMEI — must match trucks.imei in Supabase
 *   "lat"   : 6.4650,              // latitude  (decimal degrees)
 *   "lng"   : 3.4060,              // longitude (decimal degrees)
 *   "speed" : 60,                  // km/h
 *   "fuel"  : 75.5,                // % (0–100), from analog sensor or CAN bus
 *   "ts"    : 1709000000000        // Unix timestamp ms (optional)
 * }
 *
 * Fuel mapping (analog input, IO element 9):
 *   FMB920 reads 0–3300 mV → configure Teltonika Configurator to map to 0–100%
 *   OR pass raw mV here and set FUEL_SENSOR_MAX_MV env var.
 *
 * Security: all requests must include ?token=<TRACKER_SECRET>
 */

const FUEL_SENSOR_MAX_MV = Number(process.env.FUEL_SENSOR_MAX_MV ?? 0);

function mvToPercent(mv: number): number {
  if (!FUEL_SENSOR_MAX_MV) return mv;
  return Math.min(100, Math.max(0, (mv / FUEL_SENSOR_MAX_MV) * 100));
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = process.env.TRACKER_SECRET;
  if (secret) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("token") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imei  = String(body.imei  ?? "").trim();
  const lat   = Number(body.lat);
  const lng   = Number(body.lng);
  const speed = Number(body.speed ?? 0);
  const rawFuel = Number(body.fuel ?? 0);
  const fuel = FUEL_SENSOR_MAX_MV ? mvToPercent(rawFuel) : Math.min(100, Math.max(0, rawFuel));

  if (!imei || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "imei, lat, and lng are required" }, { status: 400 });
  }

  // ── Update truck ──────────────────────────────────────────────────────────
  try {
    const truck = await updateTruckByImei(imei, {
      lat:    +lat.toFixed(6),
      lng:    +lng.toFixed(6),
      speed:  +speed.toFixed(1),
      fuel:   +fuel.toFixed(1),
      status: speed > 2 ? "moving" : "idle",
    });

    if (!truck) {
      return NextResponse.json(
        { error: `No truck found with IMEI ${imei}. Set imei in Supabase trucks table.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, truck: truck.id, lat, lng, speed, fuel });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Health-check — lets you verify the endpoint is reachable before devices arrive
export async function GET(req: Request) {
  const secret = process.env.TRACKER_SECRET;
  if (secret) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("token") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.json({ status: "TrackIQ tracker endpoint ready", method: "POST" });
}

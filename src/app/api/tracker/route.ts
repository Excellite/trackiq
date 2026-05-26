import { NextResponse } from "next/server";
import {
  updateTruckByImei,
  logPosition,
  getLastPosition,
  getActiveTrip,
  startTrip,
  completeTrip,
  updateTripDistance,
} from "@/lib/store";

/**
 * Teltonika FMB920 GPS tracker webhook
 *
 * Configure in Teltonika Configurator:
 *   Server → Domain/IP : your-app.vercel.app
 *   Server → Port      : 443
 *   Server → Protocol  : HTTPS
 *   Server → URL       : /api/tracker?token=<TRACKER_SECRET>
 *   Data sending period: 30 s recommended
 *
 * POST body (JSON):
 * {
 *   "imei"  : "123456789012345",   // must match trucks.imei in Supabase
 *   "lat"   : 6.4650,
 *   "lng"   : 3.4060,
 *   "speed" : 60,                  // km/h
 *   "fuel"  : 75.5,                // % (0–100) or raw mV if FUEL_SENSOR_MAX_MV is set
 *   "ts"    : 1709000000000        // Unix ms (optional)
 * }
 */

const FUEL_MAX_MV = Number(process.env.FUEL_SENSOR_MAX_MV ?? 0);
const SPEED_MOVING_THRESHOLD = 2; // km/h

function mvToPercent(mv: number) {
  return FUEL_MAX_MV ? Math.min(100, Math.max(0, (mv / FUEL_MAX_MV) * 100)) : mv;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export async function POST(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const secret = process.env.TRACKER_SECRET;
  if (secret) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Parse ─────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const imei  = String(body.imei ?? "").trim();
  const lat   = Number(body.lat);
  const lng   = Number(body.lng);
  const speed = Number(body.speed ?? 0);
  const fuel  = +Math.min(100, Math.max(0, mvToPercent(Number(body.fuel ?? 0)))).toFixed(1);

  if (!imei || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "imei, lat, and lng are required" }, { status: 400 });
  }

  const isMoving = speed > SPEED_MOVING_THRESHOLD;

  // ── Update truck current position ─────────────────────────────────────────
  const truck = await updateTruckByImei(imei, {
    lat: +lat.toFixed(6), lng: +lng.toFixed(6),
    speed: +speed.toFixed(1), fuel,
    status: isMoving ? "moving" : "idle",
  });

  if (!truck) {
    return NextResponse.json(
      { error: `No truck with IMEI ${imei}. Set imei in Supabase trucks table.` },
      { status: 404 }
    );
  }

  // ── Log position + manage trip (fire-and-forget errors) ───────────────────
  try {
    await logPosition(truck.id, +lat.toFixed(6), +lng.toFixed(6), +speed.toFixed(1), fuel);

    const [lastPos, activeTrip] = await Promise.all([
      getLastPosition(truck.id),
      getActiveTrip(truck.id),
    ]);

    if (isMoving) {
      if (!activeTrip) {
        await startTrip(truck.id, lat, lng, fuel);
      } else if (lastPos) {
        const km = haversineKm(lastPos.lat, lastPos.lng, lat, lng);
        if (km > 0.01) await updateTripDistance(activeTrip.id!, km);
      }
    } else if (activeTrip) {
      await completeTrip(activeTrip.id!, lat, lng, fuel);
    }
  } catch {
    // Trip tracking errors should never block the tracker response
  }

  return NextResponse.json({ ok: true, truck: truck.id, lat, lng, speed, fuel });
}

export async function GET(req: Request) {
  const secret = process.env.TRACKER_SECRET;
  if (secret) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.json({ status: "TrackIQ tracker endpoint ready", method: "POST" });
}

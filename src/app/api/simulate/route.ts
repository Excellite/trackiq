import { NextResponse } from "next/server";
import { updateTruckById } from "@/lib/store";

// ── Geometry helpers ──────────────────────────────────────────────────────────
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function lerp(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  t: number
): { lat: number; lng: number } {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

// Builds A→B→C→D→C→B loop (D = turnaround point)
function loop(pts: Array<{ lat: number; lng: number }>) {
  const rev = [...pts].reverse().slice(1, -1);
  return [...pts, ...rev];
}

// ── Named waypoints (Nigerian roads) ─────────────────────────────────────────
const P = {
  APAPA:    { lat: 6.430, lng: 3.420 },
  MILE2:    { lat: 6.468, lng: 3.388 },
  TINCAN:   { lat: 6.447, lng: 3.378 },
  OSHODI:   { lat: 6.530, lng: 3.380 },
  MUSHIN:   { lat: 6.520, lng: 3.358 },
  OJOTA:    { lat: 6.595, lng: 3.344 },
  IKEJA:    { lat: 6.600, lng: 3.348 },
  MARYLAND: { lat: 6.557, lng: 3.368 },
  KARA:     { lat: 6.660, lng: 3.320 },
  SAGAMU:   { lat: 6.840, lng: 3.630 },
  IJEBU:    { lat: 7.010, lng: 3.700 },
  IBADAN:   { lat: 7.430, lng: 3.900 },
  OSOGBO:   { lat: 7.780, lng: 4.560 },
  ILORIN:   { lat: 8.500, lng: 4.560 },
  JEBBA:    { lat: 9.130, lng: 4.820 },
  BIDA:     { lat: 9.080, lng: 6.010 },
  ABUJA:    { lat: 9.070, lng: 7.490 },
  KADUNA:   { lat: 10.52, lng: 7.440 },
  KANO:     { lat: 12.01, lng: 8.520 },
  BENIN:    { lat: 6.340, lng: 5.630 },
  ORE:      { lat: 6.850, lng: 4.790 },
  VI:       { lat: 6.428, lng: 3.425 },
  LEKKI:    { lat: 6.433, lng: 3.498 },
  AJAH:     { lat: 6.473, lng: 3.578 },
  IKOYI:    { lat: 6.450, lng: 3.440 },
};

interface RouteSpec {
  waypoints: Array<{ lat: number; lng: number }>;
  avgSpeed: number;   // km/h
  phaseSec: number;   // time offset (staggers trucks)
  fuelRate: number;   // % fuel drop per km
  initFuel: number;   // % fuel at full tank
  routeName: string;
  idleAtStops?: boolean;
}

const ROUTES: Record<string, RouteSpec> = {
  "TRK-001": {
    routeName: "Apapa ↔ Ibadan",
    avgSpeed: 62,
    phaseSec: 0,
    fuelRate: 0.022,
    initFuel: 88,
    waypoints: loop([P.APAPA, P.MILE2, P.OSHODI, P.OJOTA, P.KARA, P.SAGAMU, P.IJEBU, P.IBADAN]),
  },
  "TRK-002": {
    routeName: "Ojota ↔ Ilorin",
    avgSpeed: 80,
    phaseSec: 1800,
    fuelRate: 0.020,
    initFuel: 90,
    waypoints: loop([P.OJOTA, P.KARA, P.SAGAMU, P.IBADAN, P.OSOGBO, P.ILORIN]),
  },
  "TRK-003": {
    routeName: "Ibadan ↔ Abuja",
    avgSpeed: 88,
    phaseSec: 3600,
    fuelRate: 0.019,
    initFuel: 85,
    waypoints: loop([P.IBADAN, P.OSOGBO, P.ILORIN, P.JEBBA, P.BIDA, P.ABUJA]),
  },
  "TRK-004": {
    routeName: "Mushin ↔ Benin City",
    avgSpeed: 58,
    phaseSec: 2700,
    fuelRate: 0.026,
    initFuel: 86,
    waypoints: loop([P.MUSHIN, P.SAGAMU, P.ORE, P.BENIN]),
  },
  "TRK-005": {
    routeName: "Apapa Port Loop",
    avgSpeed: 36,
    phaseSec: 900,
    fuelRate: 0.014,
    initFuel: 92,
    idleAtStops: true,
    waypoints: loop([P.MILE2, P.APAPA, P.TINCAN, P.OSHODI]),
  },
  "TRK-006": {
    routeName: "Apapa ↔ Ikeja",
    avgSpeed: 54,
    phaseSec: 5400,
    fuelRate: 0.017,
    initFuel: 87,
    waypoints: loop([P.APAPA, P.MILE2, P.MUSHIN, P.OSHODI, P.IKEJA]),
  },
  "BUS-001": {
    routeName: "Ikeja ↔ Victoria Island",
    avgSpeed: 36,
    phaseSec: 1200,
    fuelRate: 0.013,
    initFuel: 90,
    idleAtStops: true,
    waypoints: loop([P.IKEJA, P.MARYLAND, P.OSHODI, P.MUSHIN, P.VI]),
  },
  "BUS-002": {
    routeName: "Lagos ↔ Ibadan Express",
    avgSpeed: 84,
    phaseSec: 7200,
    fuelRate: 0.015,
    initFuel: 88,
    waypoints: loop([P.OJOTA, P.KARA, P.SAGAMU, P.IBADAN]),
  },
  "BUS-003": {
    routeName: "Depot ↔ Ikeja",
    avgSpeed: 30,
    phaseSec: 3200,
    fuelRate: 0.012,
    initFuel: 85,
    idleAtStops: true,
    waypoints: loop([P.APAPA, P.MILE2, P.MUSHIN, P.IKEJA]),
  },
  "CAR-001": {
    routeName: "Ikeja ↔ Ajah",
    avgSpeed: 60,
    phaseSec: 4500,
    fuelRate: 0.011,
    initFuel: 90,
    waypoints: loop([P.IKEJA, P.MARYLAND, P.VI, P.LEKKI, P.AJAH]),
  },
  "CAR-002": {
    routeName: "Office ↔ VI",
    avgSpeed: 46,
    phaseSec: 600,
    fuelRate: 0.010,
    initFuel: 88,
    idleAtStops: true,
    waypoints: loop([P.IKEJA, P.MUSHIN, P.VI, P.IKOYI]),
  },
  "CAR-003": {
    routeName: "Lekki ↔ Eko Hotel",
    avgSpeed: 68,
    phaseSec: 8100,
    fuelRate: 0.010,
    initFuel: 92,
    waypoints: loop([P.LEKKI, P.VI, P.IKOYI, P.AJAH]),
  },
  "TRL-001": {
    routeName: "Kano ↔ Abuja",
    avgSpeed: 55,
    phaseSec: 9000,
    fuelRate: 0.028,
    initFuel: 86,
    waypoints: loop([P.KANO, P.KADUNA, P.ABUJA]),
  },
  "TRL-002": {
    routeName: "Apapa ↔ Sagamu",
    avgSpeed: 48,
    phaseSec: 10800,
    fuelRate: 0.030,
    initFuel: 84,
    waypoints: loop([P.APAPA, P.MILE2, P.SAGAMU]),
  },
};

// ── Per-truck simulation at a moment in time ──────────────────────────────────
function simulate(id: string, spec: RouteSpec, nowSec: number) {
  const wps = spec.waypoints;

  // Segment distances and total route length
  const segKm: number[] = [];
  for (let i = 0; i < wps.length - 1; i++) segKm.push(haversine(wps[i], wps[i + 1]));
  const totalKm = segKm.reduce((a, b) => a + b, 0);
  const cycleSec = (totalKm / spec.avgSpeed) * 3600;

  // Where in the cycle are we?
  const elapsed = ((nowSec + spec.phaseSec) % cycleSec + cycleSec) % cycleSec;
  const kmElapsed = (elapsed / cycleSec) * totalKm;

  // Find the GPS position
  let rem = kmElapsed;
  let pos = wps[0];
  let segIdx = 0;
  for (let i = 0; i < segKm.length; i++) {
    if (rem <= segKm[i]) {
      pos = lerp(wps[i], wps[i + 1], rem / segKm[i]);
      segIdx = i;
      break;
    }
    rem -= segKm[i];
    if (i === segKm.length - 1) {
      pos = wps[wps.length - 1];
      segIdx = i;
    }
  }

  // Idle at turnaround/terminus (first 4% and midpoint ±2% of cycle)
  const cyclePos = elapsed / cycleSec;
  const nearStart = cyclePos < 0.04;
  const nearMid = Math.abs(cyclePos - 0.5) < 0.02;
  const isIdle = spec.idleAtStops && (nearStart || nearMid);

  // Smooth speed variation using a slow sine wave per truck
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const variation = Math.round(Math.sin(nowSec / 90 + seed) * 9);
  const speed = isIdle ? 0 : Math.max(18, spec.avgSpeed + variation);

  // Fuel: drains per km, auto-refuels when it would drop below 15%
  const refuelKm = (spec.initFuel - 15) / spec.fuelRate;
  const fuelPos = kmElapsed % refuelKm;
  const fuel = Math.round(Math.max(15, spec.initFuel - fuelPos * spec.fuelRate));

  const status = fuel <= 17 ? "alert" : isIdle ? "idle" : "moving";

  return {
    lat: +pos.lat.toFixed(5),
    lng: +pos.lng.toFixed(5),
    speed: isIdle ? 0 : speed,
    fuel,
    status,
    route: spec.routeName,
  };
}

// ── POST /api/simulate ────────────────────────────────────────────────────────
export async function POST() {
  const nowSec = Date.now() / 1000;

  const jobs = [
    ...Object.entries(ROUTES).map(([id, spec]) =>
      updateTruckById(id, simulate(id, spec, nowSec)).catch(() => null)
    ),
    // TRL-003 stays parked at Kano yard
    updateTruckById("TRL-003", {
      lat: 12.00, lng: 8.52, speed: 0, status: "offline", fuel: 23,
      route: "Kano Yard — Offline",
    }).catch(() => null),
  ];

  await Promise.all(jobs);

  return NextResponse.json({ ok: true, tick: new Date().toISOString() });
}

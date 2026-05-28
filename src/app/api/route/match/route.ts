import { NextResponse } from "next/server";

// OSRM map-matching — snaps raw GPS pings to actual road geometry
// POST body: { positions: Array<{ lat: number; lng: number }> }
// Returns:   { path: Array<{ lat: number; lng: number }> }

const MAX_POINTS = 100; // OSRM match endpoint practical limit

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const result: T[] = [];
  for (let i = 0; i < max - 1; i++) result.push(arr[Math.round(i * step)]);
  result.push(arr[arr.length - 1]); // always include last point
  return result;
}

export async function POST(req: Request) {
  let body: { positions?: Array<{ lat: number; lng: number }> };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const positions = body.positions ?? [];
  if (positions.length < 2) {
    return NextResponse.json({ path: positions });
  }

  const pts = downsample(positions, MAX_POINTS);

  // OSRM expects lng,lat order
  const coords = pts.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&tidy=true`;

  try {
    const res  = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (data.code !== "Ok" || !data.matchings?.length) {
      // Fall back to raw positions if OSRM can't match
      return NextResponse.json({ path: positions, fallback: true });
    }

    // Concatenate all matching segments into one path
    const path: Array<{ lat: number; lng: number }> = [];
    for (const matching of data.matchings) {
      const coords = matching.geometry.coordinates as [number, number][];
      for (const [lng, lat] of coords) path.push({ lat, lng });
    }

    return NextResponse.json({ path });
  } catch {
    // Network error — fall back to raw positions so the UI still works
    return NextResponse.json({ path: positions, fallback: true });
  }
}

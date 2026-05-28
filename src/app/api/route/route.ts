import { NextResponse } from "next/server";

// Free road routing via OSRM (OpenStreetMap) — no billing required
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const oLat = searchParams.get("oLat");
  const oLng = searchParams.get("oLng");
  const dLat = searchParams.get("dLat");
  const dLng = searchParams.get("dLng");

  if (!oLat || !oLng || !dLat || !dLng) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  // OSRM expects coordinates as lng,lat (not lat,lng)
  const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;

  try {
    const res  = await fetch(url, { next: { revalidate: 3600 } }); // cache 1 hour
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes?.[0]) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    // GeoJSON coordinates are [lng, lat] — convert to [{lat, lng}]
    const path = (data.routes[0].geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => ({ lat, lng })
    );

    return NextResponse.json({
      path,
      distance_m: data.routes[0].distance,
      duration_s: data.routes[0].duration,
    });
  } catch {
    return NextResponse.json({ error: "Routing service unavailable" }, { status: 502 });
  }
}

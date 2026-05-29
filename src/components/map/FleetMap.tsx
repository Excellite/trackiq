"use client";

import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Truck } from "@/data/trucks";

const NIGERIA = { lat: 9.08, lng: 8.68 };

const ROUTE_COLORS = [
  "#3B82F6","#8B5CF6","#EC4899","#F59E0B","#06B6D4",
  "#10B981","#EF4444","#F97316","#6366F1","#14B8A6",
  "#A855F7","#84CC16","#0EA5E9","#FB923C","#E879F9",
];

export interface TruckRoute {
  truckId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

function markerIcon(truck: Truck, selected: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: "#1558D6",
    fillOpacity: 1,
    strokeColor: selected ? "#fff" : "rgba(255,255,255,0.6)",
    strokeWeight: selected ? 2.5 : 1.5,
    scale: selected ? 11 : 9,
  };
}

function pinIcon(color: string, scale = 8): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
    scale,
  };
}

function destinationIcon(): google.maps.Symbol {
  return {
    path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 Z",
    fillColor: "#22C55E",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 1.5,
    scale: 1.1,
    anchor: new google.maps.Point(0, 0),
  };
}

function FitBounds({ positions }: { positions: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (!map || positions.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    positions.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

// Keeps the camera locked onto the last GPS point while in follow mode
function CameraFollow({ positions }: { positions: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  const initialised = useRef(false);
  const last = positions[positions.length - 1];

  useEffect(() => {
    if (!map || !last) return;
    if (!initialised.current) {
      // First activation — fit the full trail then zoom into the truck
      if (positions.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        positions.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 80);
        // After fit, zoom closer to the truck head
        setTimeout(() => map.setZoom(14), 600);
      } else {
        map.panTo(last);
        map.setZoom(14);
      }
      initialised.current = true;
    } else {
      map.panTo(last);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.lat, last?.lng]);

  return null;
}

function headDotIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: "#fff",
    fillOpacity: 1,
    strokeColor: "#1558D6",
    strokeWeight: 4,
    scale: 10,
  };
}

function TruckRoute({ route, color, fitMap = false }: { route: TruckRoute; color: string; fitMap?: boolean }) {
  const [path, setPath] = useState<Array<{ lat: number; lng: number }>>([]);
  const map = useMap();

  useEffect(() => {
    const { origin: o, destination: d } = route;
    fetch(`/api/route?oLat=${o.lat}&oLng=${o.lng}&dLat=${d.lat}&dLng=${d.lng}`)
      .then((r) => r.json())
      .then((data) => {
        const p: Array<{ lat: number; lng: number }> = data.path?.length > 1 ? data.path : [o, d];
        setPath(p);
        if (fitMap && map && p.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          p.forEach((pt) => bounds.extend(pt));
          map.fitBounds(bounds, 60);
        }
      })
      .catch(() => setPath([route.origin, route.destination]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.origin.lat, route.origin.lng, route.destination.lat, route.destination.lng, map, fitMap]);

  if (path.length < 2) return null;

  return (
    <>
      <Polyline path={path} strokeColor={color} strokeWeight={4} strokeOpacity={0.75} geodesic />
      <Marker position={route.origin}      icon={pinIcon("#22C55E", 7)} title="Trip start"  zIndex={5} />
      <Marker position={route.destination} icon={destinationIcon()}      title="Destination" zIndex={5} />
    </>
  );
}

// ── Clustered truck markers (imperative, avoids per-marker hook limits) ────────
function ClusteredTruckMarkers({
  trucks,
  selectedId,
  onSelect,
  onInfo,
}: {
  trucks: Truck[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInfo: (id: string) => void;
}) {
  const map = useMap();
  const gMarkers = useRef<google.maps.Marker[]>([]);
  const clusterer = useRef<MarkerClusterer | null>(null);

  const rebuild = useCallback(() => {
    if (!map) return;
    gMarkers.current.forEach((m) => m.setMap(null));
    clusterer.current?.clearMarkers();

    const markers = trucks.map((truck) => {
      const m = new google.maps.Marker({
        position: { lat: truck.lat, lng: truck.lng },
        icon: markerIcon(truck, selectedId === truck.id),
        title: `${truck.name} · ${truck.driver}`,
        zIndex: 10,
      });
      m.addListener("click", () => { onSelect(truck.id); onInfo(truck.id); });
      return m;
    });

    gMarkers.current = markers;
    clusterer.current = new MarkerClusterer({ map, markers });
  }, [map, trucks, selectedId, onSelect, onInfo]);

  useEffect(() => { rebuild(); }, [rebuild]);
  useEffect(() => () => {
    gMarkers.current.forEach((m) => m.setMap(null));
    clusterer.current?.clearMarkers();
  }, []);

  return null;
}

export function FleetMap({
  trucks,
  selectedId,
  onSelect,
  routes = [],
  routePositions = [],
  followPositions = [],
  trailPositions = {},
  zoom = 6,
  fitRoute = false,
}: {
  trucks: Truck[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  routes?: TruckRoute[];
  routePositions?: Array<{ lat: number; lng: number }>;
  followPositions?: Array<{ lat: number; lng: number }>;
  trailPositions?: Record<string, Array<{ lat: number; lng: number }>>;
  zoom?: number;
  fitRoute?: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const [infoId, setInfoId] = useState<string | null>(null);
  const infoTruck = trucks.find((t) => t.id === infoId);

  if (!apiKey) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--surface-2)] gap-2 p-6 text-center">
        <p className="text-sm font-semibold text-[var(--text)]">Google Maps API key required</p>
        <p className="text-xs text-[var(--subtle)]">Add to <span className="font-mono">.env.local</span>:</p>
        <code className="text-xs font-mono text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-lg">
          NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here
        </code>
      </div>
    );
  }

  const defaultCenter =
    routePositions.length > 0
      ? routePositions[Math.floor(routePositions.length / 2)]
      : NIGERIA;

  const defaultZoom = routePositions.length > 0 ? 8 : zoom;

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        {/* Historical route replay (TruckDetails) */}
        {routePositions.length > 1 && (
          <>
            <FitBounds positions={routePositions} />
            <Polyline path={routePositions} strokeColor="#F59E0B" strokeOpacity={0.9} strokeWeight={3} geodesic />
            <Marker position={routePositions[0]} icon={pinIcon("#22C55E", 7)} title="Start" />
            <Marker position={routePositions[routePositions.length - 1]} icon={pinIcon("#F59E0B", 7)} title="End" />
          </>
        )}

        {/* Follow mode — Google Maps style thick blue route trail */}
        {followPositions.length > 0 && (
          <>
            <CameraFollow positions={followPositions} />
            {followPositions.length > 1 && (
              <>
                {/* Layer 1: white glow for depth */}
                <Polyline path={followPositions} strokeColor="#ffffff" strokeWeight={22} strokeOpacity={0.18} geodesic />
                {/* Layer 2: dark border */}
                <Polyline path={followPositions} strokeColor="#0D3080" strokeWeight={16} strokeOpacity={1}    geodesic />
                {/* Layer 3: vivid blue fill — Google Maps nav colour */}
                <Polyline path={followPositions} strokeColor="#1558D6" strokeWeight={11} strokeOpacity={1}    geodesic />
              </>
            )}
            {/* Origin dot */}
            <Marker position={followPositions[0]} icon={pinIcon("#1558D6", 9)} title="Journey start" zIndex={8} />
            {/* Head dot — white circle with blue ring at truck's latest point */}
            <Marker position={followPositions[followPositions.length - 1]} icon={headDotIcon()} title="Current position" zIndex={9} />
          </>
        )}

        {/* Short position trails (last N pings) per truck */}
        {Object.entries(trailPositions).map(([id, pts]) =>
          pts.length > 1 ? (
            <Polyline
              key={`trail-${id}`}
              path={pts}
              strokeColor="#1558D6"
              strokeWeight={3}
              strokeOpacity={0.35}
              geodesic
            />
          ) : null
        )}

        {/* Live trip routes — real road directions per truck */}
        {routes.map((r, i) => (
          <TruckRoute key={r.truckId} route={r} color={ROUTE_COLORS[i % ROUTE_COLORS.length]} fitMap={fitRoute && i === 0} />
        ))}

        {/* Clustered truck position markers */}
        <ClusteredTruckMarkers
          trucks={trucks}
          selectedId={selectedId}
          onSelect={onSelect}
          onInfo={(id) => setInfoId((prev) => (prev === id ? null : id))}
        />

        {/* Info popup */}
        {infoTruck && (
          <InfoWindow
            position={{ lat: infoTruck.lat, lng: infoTruck.lng }}
            onCloseClick={() => setInfoId(null)}
          >
            <div style={{ padding: "4px 2px", minWidth: 160 }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: "#111" }}>{infoTruck.name}</p>
              <p style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace", marginBottom: 6 }}>{infoTruck.id}</p>
              <table style={{ fontSize: 12, borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Driver", infoTruck.driver],
                    ["Speed",  `${infoTruck.speed} km/h`],
                    ["Fuel",   `${infoTruck.fuel}%`],
                    ["Route",  infoTruck.route || "—"],
                    ["GPS",    `${infoTruck.lat.toFixed(4)}°N  ${infoTruck.lng.toFixed(4)}°E`],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td style={{ color: "#9CA3AF", paddingRight: 8, paddingBottom: 2 }}>{label}</td>
                      <td style={{ color: "#111", fontWeight: 500 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FleetMap, TruckRoute } from "@/components/map/FleetMap";
import { StatusBadge } from "@/components/ui/status-badge";
import { FuelBar } from "@/components/ui/fuel-bar";
import { LiveDot } from "@/components/ui/live-dot";
import { cn } from "@/lib/cn";
import { fuelText } from "@/lib/constants";
import type { Truck } from "@/data/trucks";
import type { Trip } from "@/lib/store";

interface Position { lat: number; lng: number; speed: number; fuel: number; recorded_at: string }

function haversineKm(a: Position, b: Position) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function LiveMap({
  trucks,
  onSelectTruck,
}: {
  trucks: Truck[];
  onSelectTruck: (id: string) => void;
}) {
  const [selId,        setSelId]        = useState<string | null>(null);
  const [routes,       setRoutes]       = useState<TruckRoute[]>([]);
  const [routesErr,    setRoutesErr]    = useState<string | null>(null);
  const [followId,     setFollowId]     = useState<string | null>(null);
  const [positions,    setPositions]    = useState<Position[]>([]);
  const followInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPositions = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/trucks/${id}/positions`);
      const j = await res.json();
      setPositions(j.data ?? []);
    } catch { /* keep last positions */ }
  }, []);

  const startFollow = useCallback((id: string) => {
    setFollowId(id);
    setSelId(id);
    setPositions([]);
    fetchPositions(id);
    if (followInterval.current) clearInterval(followInterval.current);
    followInterval.current = setInterval(() => fetchPositions(id), 5_000);
  }, [fetchPositions]);

  const stopFollow = useCallback(() => {
    setFollowId(null);
    setPositions([]);
    if (followInterval.current) { clearInterval(followInterval.current); followInterval.current = null; }
  }, []);

  useEffect(() => () => { if (followInterval.current) clearInterval(followInterval.current); }, []);

  const followTruck = trucks.find((t) => t.id === followId) ?? null;
  const followLatLngs = useMemo(() => positions.map((p) => ({ lat: p.lat, lng: p.lng })), [positions]);
  const routeKm = useMemo(() => {
    if (positions.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < positions.length; i++) d += haversineKm(positions[i - 1], positions[i]);
    return d;
  }, [positions]);

  const selTruck = trucks.find((t) => t.id === selId) ?? null;
  const moving   = trucks.filter((t) => t.status === "moving").length;
  const alerts   = trucks.filter((t) => t.status === "alert").length;
  const idle     = trucks.filter((t) => t.status === "idle").length;

  // Fetch the latest trip per truck and build route objects
  useEffect(() => {
    setRoutesErr(null);
    fetch("/api/trips")
      .then((r) => r.json())
      .then((j) => {
        const trips: Trip[] = j.data ?? [];

        // Latest completed trip per truck (most recent ended_at)
        const latest = new Map<string, Trip>();
        trips
          .filter((t) => t.status === "completed" && t.end_lat != null && t.end_lng != null)
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
          .forEach((t) => {
            if (!latest.has(t.truck_id)) latest.set(t.truck_id, t);
          });

        // Active trips override completed ones
        trips
          .filter((t) => t.status === "active" && t.start_lat != null)
          .forEach((t) => {
            const truck = trucks.find((tr) => tr.id === t.truck_id);
            if (truck) {
              latest.set(t.truck_id, {
                ...t,
                end_lat:  truck.lat,
                end_lng:  truck.lng,
              });
            }
          });

        const built: TruckRoute[] = [];
        latest.forEach((trip, truckId) => {
          if (trip.start_lat && trip.start_lng && trip.end_lat && trip.end_lng) {
            built.push({
              truckId,
              origin:      { lat: Number(trip.start_lat), lng: Number(trip.start_lng) },
              destination: { lat: Number(trip.end_lat),   lng: Number(trip.end_lng)   },
            });
          }
        });
        setRoutes(built);
      })
      .catch((err: unknown) => setRoutesErr((err as Error).message ?? "Failed to load trip routes"));
  }, [trucks]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[var(--text)]">Live Fleet Map</h1>
          <LiveDot pulse color="bg-emerald-500" />
        </div>
        <p className="text-xs text-[var(--subtle)] mt-0.5">
          Real-time positions · routes show each vehicle&apos;s last trip (start → destination)
        </p>
      </div>

      {routesErr && (
        <p className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
          ⚠ Could not load trip routes — map will still show vehicle positions.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Map */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">
              Nigeria · {trucks.length} vehicles tracked
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-[var(--muted)]">
              {[
                ["bg-emerald-500", "Moving"],
                ["bg-gray-400",    "Idle"  ],
                ["bg-red-500",     "Alert" ],
              ].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", c)} />{l}
                </span>
              ))}
              {followId ? (
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <span className="w-3 h-1 bg-blue-500 rounded" />Following
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-blue-400 rounded" />Route
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />Start
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="h-[300px] sm:h-[420px] lg:h-[520px]">
            <FleetMap
              trucks={trucks}
              selectedId={selId}
              routes={followId ? [] : routes}
              followPositions={followLatLngs}
              onSelect={(id) => {
                setSelId(selId === id ? null : id);
                if (followId) stopFollow();
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Fleet status */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3 shadow-sm">
            <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">Fleet Status</p>
            {[
              { label: "Moving", value: moving,       color: "text-emerald-600", dot: "bg-emerald-500" },
              { label: "Idle",   value: idle,          color: "text-[var(--muted)]",   dot: "bg-gray-400"    },
              { label: "Alert",  value: alerts,        color: "text-red-600",    dot: "bg-red-500"     },
              { label: "Total",  value: trucks.length, color: "text-[var(--text)]",   dot: "bg-orange-500"  },
            ].map(({ label, value, color, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", dot)} />
                  <span className="text-sm text-[var(--muted)]">{label}</span>
                </div>
                <span className={cn("text-sm font-bold font-mono tabular-nums", color)}>{value}</span>
              </div>
            ))}
          </div>

          {/* Follow mode — navigation bar */}
          {followTruck ? (
            <div className="bg-[var(--surface)] border-2 border-blue-500 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-blue-400 uppercase tracking-widest font-semibold mb-0.5">Following</p>
                  <p className="text-sm font-bold text-[var(--text)]">{followTruck.name}</p>
                </div>
                <StatusBadge status={followTruck.status} />
              </div>

              {/* Live stats */}
              <div className="grid grid-cols-3 divide-x divide-[var(--border)] text-center">
                {[
                  { val: followTruck.speed, unit: "km/h",   label: "Speed"    },
                  { val: routeKm.toFixed(1), unit: "km",    label: "Trail"    },
                  { val: positions.length,   unit: "pings", label: "History"  },
                ].map(({ val, unit, label }) => (
                  <div key={label} className="px-2 py-1">
                    <p className="text-lg font-bold font-mono text-[var(--text)] leading-none">{val}</p>
                    <p className="text-[10px] text-[var(--subtle)] mt-0.5">{unit}</p>
                    <p className="text-[9px] text-[var(--muted)] uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              {/* GPS */}
              {positions.length > 0 && (
                <p className="text-[10px] font-mono text-[var(--subtle)] text-center">
                  {positions[positions.length - 1].lat.toFixed(5)}°N &nbsp;
                  {positions[positions.length - 1].lng.toFixed(5)}°E
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onSelectTruck(followTruck.id)}
                  className="flex-1 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] text-xs font-semibold border border-[var(--border)]"
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  onClick={stopFollow}
                  className="flex-1 bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800 text-xs font-semibold"
                >
                  ✕ Exit Follow
                </Button>
              </div>
            </div>

          ) : selTruck ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{selTruck.name}</p>
                  <p className="text-xs text-[var(--subtle)] font-mono">{selTruck.id}</p>
                </div>
                <StatusBadge status={selTruck.status} />
              </div>

              <div className="space-y-1.5 text-xs">
                {[
                  ["Driver", selTruck.driver,                  "text-[var(--text)]"],
                  ["Route",  selTruck.route,                   "text-blue-600 font-mono text-[10px]"],
                  ["Speed",  `${selTruck.speed} km/h`,         selTruck.speed > 90 ? "text-red-500 font-mono" : "text-[var(--text)] font-mono"],
                  ["GPS",    `${selTruck.lat.toFixed(3)}°N  ${selTruck.lng.toFixed(3)}°E`, "text-[var(--subtle)] font-mono text-[10px]"],
                ].map(([label, val, cls]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-[var(--subtle)] shrink-0">{label}</span>
                    <span className={cn("text-right", cls)}>{val}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--subtle)]">Fuel</span>
                  <span className={cn("font-mono font-bold", fuelText(selTruck.fuel))}>{selTruck.fuel}%</span>
                </div>
                <FuelBar pct={selTruck.fuel} />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => startFollow(selTruck.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  ▶ Follow Route
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSelectTruck(selTruck.id)}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold"
                >
                  Details →
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center shadow-sm">
              <p className="text-xs text-[var(--subtle)]">Click a vehicle marker to see details</p>
            </div>
          )}

          {/* All trucks list */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
            <div className="py-2 px-4 border-b border-[var(--border)]">
              <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">All Vehicles</p>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {trucks.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-sub)] transition-colors hover:bg-[var(--surface-2)]",
                    selId === t.id && "bg-blue-500/5",
                    followId === t.id && "bg-blue-500/10 border-l-2 border-l-blue-500"
                  )}
                >
                  <button className="flex-1 text-left" onClick={() => { setSelId(t.id); if (followId) stopFollow(); }}>
                    <p className="text-xs font-semibold text-[var(--text)]">{t.name}</p>
                    <p className="text-[10px] text-[var(--subtle)] font-mono">{t.driver || t.id}</p>
                  </button>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <button
                      onClick={() => followId === t.id ? stopFollow() : startFollow(t.id)}
                      className={cn(
                        "text-[10px] font-semibold px-2 py-1 rounded transition-colors",
                        followId === t.id
                          ? "bg-blue-500/20 text-blue-400 hover:bg-red-500/20 hover:text-red-400"
                          : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-blue-500/20 hover:text-blue-400"
                      )}
                    >
                      {followId === t.id ? "Exit" : "Follow"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

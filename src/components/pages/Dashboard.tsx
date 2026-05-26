"use client";

import { useEffect, useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Sidebar }       from "@/components/layout/Sidebar";
import { LiveDot }       from "@/components/ui/live-dot";
import { KPICard }       from "@/components/ui/kpi-card";
import { NigeriaMap }    from "@/components/map/NigeriaMap";
import { TruckListItem } from "@/components/trucks/TruckListItem";
import { TruckDetails }  from "@/components/pages/TruckDetails";
import { LiveMap }       from "@/components/pages/LiveMap";
import { TrucksPage }    from "@/components/pages/TrucksPage";
import { FuelPage }      from "@/components/pages/FuelPage";
import { Setup }               from "@/components/pages/Setup";
import { VehicleRegistration } from "@/components/pages/VehicleRegistration";

import { useFleetData }     from "@/hooks/useFleetData";
import { cn }               from "@/lib/cn";
import { fuelText, fuelTw } from "@/lib/constants";
import type { Truck }       from "@/data/trucks";

interface User {
  name: string;
  email: string;
  role: string;
}

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const {
    trucks:    apiTrucks,
    summary,
    loading,
    error:     apiError,
    lastUpdated,
    refresh,
  } = useFleetData({ pollInterval: 5_000, enabled: !!user });

  const [trucks,     setTrucks]     = useState<Truck[]>([]);
  const [selId,      setSelId]      = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailId,   setDetailId]   = useState<string | null>(null);
  const [activeNav,  setActiveNav]  = useState("dashboard");

  useEffect(() => {
    if (apiTrucks.length > 0) setTrucks(apiTrucks);
  }, [apiTrucks]);

  // Live position simulation — remove when a real GPS feed is available
  useEffect(() => {
    if (trucks.length === 0) return;
    const timer = setInterval(() => {
      setTrucks((prev) =>
        prev.map((tr) => {
          if (tr.status !== "moving") return tr;
          return {
            ...tr,
            lat:   tr.lat + (Math.random() - 0.5) * 0.008,
            lng:   tr.lng + (Math.random() - 0.5) * 0.008,
            fuel:  +Math.max(0, tr.fuel - (Math.random() < 0.3 ? Math.random() * 0.3 : 0)).toFixed(1),
            speed: +Math.max(30, Math.min(100, tr.speed + (Math.random() - 0.5) * 8)).toFixed(0),
          };
        })
      );
    }, 2_000);
    return () => clearInterval(timer);
  }, [trucks.length]);

  const openDetail = useCallback((id: string | null | undefined) => {
    if (!id) return;
    setDetailId(id);
    setShowDetail(true);
  }, []);

  const moving  = trucks.filter((t) => t.status === "moving").length;
  const alerts  = trucks.filter((t) => t.status === "alert").length;
  const avgFuel: string | number = trucks.length
    ? (trucks.reduce((a, t) => a + t.fuel, 0) / trucks.length).toFixed(0)
    : summary?.avgFuel ?? "—";
  const avgSpd = moving
    ? +(trucks.filter((t) => t.status === "moving").reduce((a, t) => a + t.speed, 0) / moving).toFixed(0)
    : summary?.avgSpeed ?? 0;

  const detailTruck = trucks.find((t) => t.id === detailId) ?? null;

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <Sidebar
        activeNav={activeNav}
        onNav={(id) => {
          setActiveNav(id);
          setShowDetail(false);
        }}
        user={user}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 md:p-7 overflow-y-auto">

        {/* Loading skeleton */}
        {loading && trucks.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Loading fleet data…</p>
            </div>
          </div>
        )}

        {/* API error banner */}
        {apiError && (
          <Alert className="border-red-500/40 bg-red-500/10 text-red-400 mb-4">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>⚠ {apiError.message}</span>
              {apiError.retryable && (
                <button
                  onClick={refresh}
                  className="text-xs underline text-red-300 hover:text-red-200 transition-colors whitespace-nowrap"
                >
                  Retry
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {(!loading || trucks.length > 0) && (
          <>
            {/* Truck detail view — shown from any page */}
            {showDetail && detailTruck ? (
              <TruckDetails truck={detailTruck} onBack={() => setShowDetail(false)} />

            ) : activeNav === "map" ? (
              <LiveMap trucks={trucks} onSelectTruck={openDetail} />

            ) : activeNav === "trucks" ? (
              <TrucksPage trucks={trucks} onSelectTruck={openDetail} />

            ) : activeNav === "fuel" ? (
              <FuelPage trucks={trucks} onSelectTruck={openDetail} />

            ) : activeNav === "register" ? (
              <VehicleRegistration />

            ) : activeNav === "setup" ? (
              <Setup />

            ) : (
              /* Dashboard (default) */
              <div className="space-y-5">

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-xl font-bold text-white">Fleet Overview</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live data · auto-refreshing every 5 s
                      {lastUpdated && (
                        <span className="ml-2 text-slate-600">
                          · last updated {lastUpdated.toLocaleTimeString("en-NG")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <LiveDot pulse color="bg-emerald-400" />
                    <span className="text-xs text-emerald-400 font-mono">LIVE</span>
                    <span className="text-xs text-slate-500 ml-3">
                      {new Date().toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>

                {alerts > 0 && (
                  <Alert
                    className="border-red-500/40 bg-red-500/10 text-red-400 cursor-pointer"
                    onClick={() => openDetail(trucks.find((t) => t.status === "alert")?.id)}
                  >
                    <AlertDescription>
                      ⚠ {alerts} truck{alerts > 1 ? "s" : ""} need{alerts === 1 ? "s" : ""} immediate attention. Click to view.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <KPICard icon="🚛" label="Active Trucks"  value={`${moving}/${trucks.length}`} valueClass={moving > 0 ? "text-emerald-400" : "text-slate-400"} sub={`${alerts} alert${alerts !== 1 ? "s" : ""}`} />
                  <KPICard icon="⛽" label="Avg Fuel Level"  value={`${avgFuel}%`}                valueClass={fuelText(+avgFuel)} sub="Across all trucks" />
                  <KPICard icon="🚀" label="Avg Speed"       value={`${avgSpd} km/h`}             valueClass="text-blue-400"      sub="Moving trucks only" />
                  <KPICard icon="⚠️" label="Alerts"          value={alerts}                       valueClass={alerts > 0 ? "text-red-400" : "text-emerald-400"} sub={alerts > 0 ? "Requires attention" : "All clear"} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
                  <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-slate-700/30">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Live Fleet Map · Nigeria</p>
                        <div className="flex gap-4 text-xs text-slate-400">
                          {[["bg-emerald-400","Moving"],["bg-slate-500","Idle"],["bg-red-400","Alert"]].map(([c,l]) => (
                            <span key={l} className="flex items-center gap-1.5">
                              <span className={cn("w-2 h-2 rounded-full", c)} />{l}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <div className="h-[330px]">
                      <NigeriaMap
                        trucks={trucks}
                        selectedId={selId}
                        onSelect={(id) => { setSelId(id); openDetail(id); }}
                      />
                    </div>
                  </Card>

                  <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-slate-700/30">
                      <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">All Trucks</p>
                    </CardHeader>
                    <div className="overflow-y-auto h-[330px]">
                      {trucks.length === 0 ? (
                        <p className="text-sm text-slate-500 p-5">No trucks found.</p>
                      ) : (
                        trucks.map((t) => (
                          <TruckListItem key={t.id} truck={t} onClick={() => openDetail(t.id)} />
                        ))
                      )}
                    </div>
                  </Card>
                </div>

                <Card className="bg-slate-800/60 border-slate-700/50">
                  <CardHeader className="py-4 px-5 border-b border-slate-700/30">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Fuel Monitoring · All Trucks</p>
                        <p className="text-xs text-slate-500 mt-0.5">Current fuel level — click a bar for details</p>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-400">
                        {[["bg-emerald-500","Normal >50%"],["bg-amber-500","Low 20–50%"],["bg-red-500","Critical <20%"]].map(([c,l]) => (
                          <span key={l} className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-sm", c)} />{l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="flex gap-4 items-end h-28">
                      {trucks.map((t) => (
                        <div key={t.id} onClick={() => openDetail(t.id)} className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group">
                          <span className={cn("text-xs font-mono font-bold group-hover:scale-110 transition-transform tabular-nums", fuelText(t.fuel))}>
                            {t.fuel}%
                          </span>
                          <div className="w-full bg-slate-700 rounded-lg h-20 flex items-end overflow-hidden">
                            <div className={cn("w-full rounded-lg transition-all duration-700", fuelTw(t.fuel))} style={{ height: `${t.fuel}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{t.id.slice(4)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

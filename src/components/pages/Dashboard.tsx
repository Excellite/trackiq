"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Sidebar }       from "@/components/layout/Sidebar";
import { KPICard }       from "@/components/ui/kpi-card";
import { NigeriaMap }    from "@/components/map/NigeriaMap";
import { TruckListItem } from "@/components/trucks/TruckListItem";
import { TruckDetails }  from "@/components/pages/TruckDetails";
import { LiveMap }       from "@/components/pages/LiveMap";
import { TrucksPage }    from "@/components/pages/TrucksPage";
import { FuelPage }      from "@/components/pages/FuelPage";
import { VehicleRegistration } from "@/components/pages/VehicleRegistration";
import { ReportsPage }         from "@/components/pages/ReportsPage";
import { MaintenancePage }     from "@/components/pages/MaintenancePage";
import { DriversPage }         from "@/components/pages/DriversPage";
import { DocumentsPage }       from "@/components/pages/DocumentsPage";
import { NotificationsPanel }  from "@/components/layout/NotificationsPanel";

import { SettingsPanel }  from "@/components/layout/SettingsPanel";
import { MobileTopBar, MobileDrawer } from "@/components/layout/MobileSidebar";

import { useFleetData }     from "@/hooks/useFleetData";
import { useOnline }        from "@/hooks/useOnline";
import { LiveDot }          from "@/components/ui/live-dot";
import { cn }               from "@/lib/cn";
import { fuelText, fuelTw } from "@/lib/constants";
import { checkGeofence }    from "@/lib/geofence";
import type { Truck }       from "@/data/trucks";

interface User {
  name: string;
  email: string;
  role: string;
}

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const online = useOnline();
  const [refreshInterval, setRefreshInterval] = useState(5_000);
  const [settingsOpen,    setSettingsOpen]    = useState(false);
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [demoing,         setDemoing]         = useState(false);
  const demoRef = useRef<(() => void) | null>(null);

  const {
    trucks:    apiTrucks,
    summary,
    loading,
    error:     apiError,
    lastUpdated,
    refresh,
  } = useFleetData({ pollInterval: refreshInterval, enabled: !!user });

  const [trucks,     setTrucks]     = useState<Truck[]>([]);
  const [selId,      setSelId]      = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailId,   setDetailId]   = useState<string | null>(null);
  const [activeNav,  setActiveNav]  = useState("dashboard");

  useEffect(() => {
    if (apiTrucks.length > 0) setTrucks(apiTrucks);
  }, [apiTrucks]);

  const openDetail = useCallback((id: string | null | undefined) => {
    if (!id) return;
    setDetailId(id);
    setShowDetail(true);
  }, []);

  // Always call the latest refresh without making tick depend on it
  demoRef.current = refresh;
  const tick = useCallback(async () => {
    await fetch("/api/simulate", { method: "POST" }).catch(() => null);
    demoRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!demoing) return;
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [demoing, tick]);

  const toggleDemo = useCallback(() => setDemoing((v) => !v), []);

  const moving  = trucks.filter((t) => t.status === "moving").length;
  const alerts  = trucks.filter((t) => t.status === "alert").length;
  const today   = new Date().toISOString().split("T")[0];
  const geofenceBreaches = trucks.filter((t) => checkGeofence(t.id, t.lat, t.lng)?.breached);
  const overdueService = trucks.filter((t) => t.nextService && t.nextService < today);
  const dueSoonService = trucks.filter((t) => {
    if (!t.nextService || t.nextService < today) return false;
    const daysLeft = (new Date(t.nextService).getTime() - Date.now()) / 86_400_000;
    return daysLeft <= 14;
  });
  const avgFuel: string | number = trucks.length
    ? (trucks.reduce((a, t) => a + t.fuel, 0) / trucks.length).toFixed(0)
    : summary?.avgFuel ?? "—";
  const avgSpd = moving
    ? +(trucks.filter((t) => t.status === "moving").reduce((a, t) => a + t.speed, 0) / moving).toFixed(0)
    : summary?.avgSpeed ?? 0;

  const detailTruck = trucks.find((t) => t.id === detailId) ?? null;

  const pageTitle = showDetail ? "Truck Detail" : activeNav === "dashboard" ? "Fleet Overview" : activeNav === "trucks" ? "Fleet" : activeNav === "drivers" ? "Drivers" : activeNav === "documents" ? "Compliance" : activeNav.replace("-", " ");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[#1E2535] flex">
      {/* Mobile top bar + drawer */}
      <MobileTopBar title={pageTitle} user={user} onMenuOpen={() => setDrawerOpen(true)} />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeNav={activeNav}
        onNav={(id) => { setActiveNav(id); setShowDetail(false); }}
        user={user}
        onLogout={onLogout}
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

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Offline banner */}
        {!online && (
          <div className="bg-yellow-500 text-yellow-950 text-xs font-semibold text-center py-1.5 px-4 shrink-0">
            ⚡ No internet connection — showing last known data
          </div>
        )}
        {/* Top header bar */}
        <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] hidden md:flex items-center px-6 gap-4 shrink-0 shadow-sm">
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-[var(--text)] capitalize">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <LiveDot pulse color="bg-emerald-500" />
              <span className="text-xs font-mono text-emerald-600 font-semibold">LIVE</span>
            </div>
            <button
              onClick={toggleDemo}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                demoing
                  ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/25"
                  : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)] hover:border-orange-400 hover:text-orange-500"
              )}
              title={demoing ? "Stop demo simulation" : "Start live demo — trucks move in real time"}
            >
              {demoing && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              {demoing ? "Stop Demo" : "▶ Demo Mode"}
            </button>
            <span className="text-xs text-[var(--subtle)] hidden sm:block">
              {new Date().toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            <NotificationsPanel onSelectTruck={openDetail} />
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200 cursor-pointer"
              onClick={() => setSettingsOpen(true)}>
              <span className="text-xs font-bold text-orange-500">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>

      <main className="flex-1 pt-14 md:pt-0 p-4 md:p-6 overflow-y-auto bg-[var(--bg)]">

        {/* Loading skeleton */}
        {loading && trucks.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[var(--muted)]">Loading fleet data…</p>
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

            ) : activeNav === "drivers" ? (
              <DriversPage onSelectTruck={openDetail} />

            ) : activeNav === "reports" ? (
              <ReportsPage trucks={trucks} onSelectTruck={openDetail} />

            ) : activeNav === "register" ? (
              <VehicleRegistration onNav={(id) => { setActiveNav(id); setShowDetail(false); }} />

            ) : activeNav === "documents" ? (
              <DocumentsPage trucks={trucks} />

            ) : activeNav === "maintenance" ? (
              <MaintenancePage trucks={trucks} />

            ) : (
              /* Dashboard (default) */
              <div className="space-y-5">

                {lastUpdated && (
                  <p className="text-xs text-[var(--subtle)]">
                    Auto-refreshing every 5 s · last updated {lastUpdated.toLocaleTimeString("en-NG")}
                  </p>
                )}

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

                {geofenceBreaches.length > 0 && (
                  <Alert className="border-orange-500/40 bg-orange-500/10 text-orange-400">
                    <AlertDescription>
                      🚧 {geofenceBreaches.length} vehicle{geofenceBreaches.length > 1 ? "s" : ""} outside assigned zone: {geofenceBreaches.slice(0, 3).map((t) => t.id).join(", ")}{geofenceBreaches.length > 3 ? ` +${geofenceBreaches.length - 3} more` : ""}.
                    </AlertDescription>
                  </Alert>
                )}

                {overdueService.length > 0 && (
                  <Alert
                    className="border-red-500/40 bg-red-500/10 text-red-400 cursor-pointer"
                    onClick={() => setActiveNav("maintenance")}
                  >
                    <AlertDescription>
                      🔧 {overdueService.length} vehicle{overdueService.length > 1 ? "s" : ""} overdue for service: {overdueService.slice(0, 3).map((t) => t.id).join(", ")}{overdueService.length > 3 ? ` +${overdueService.length - 3} more` : ""}. Click to schedule.
                    </AlertDescription>
                  </Alert>
                )}

                {dueSoonService.length > 0 && overdueService.length === 0 && (
                  <Alert
                    className="border-orange-400/40 bg-orange-400/10 text-orange-400 cursor-pointer"
                    onClick={() => setActiveNav("maintenance")}
                  >
                    <AlertDescription>
                      🔧 {dueSoonService.length} vehicle{dueSoonService.length > 1 ? "s" : ""} due for service within 14 days. Click to view.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KPICard icon="🚛" label="Active Trucks"  value={`${moving}/${trucks.length}`} valueClass={moving > 0 ? "text-emerald-400" : "text-[var(--subtle)]"} sub={`${alerts} alert${alerts !== 1 ? "s" : ""}`} />
                  <KPICard icon="⛽" label="Avg Fuel Level"  value={`${avgFuel}%`}                valueClass={fuelText(+avgFuel)} sub="Across all trucks" />
                  <KPICard icon="🚀" label="Avg Speed"       value={`${avgSpd} km/h`}             valueClass="text-blue-400"      sub="Moving trucks only" />
                  <KPICard icon="⚠️" label="Alerts"          value={alerts}                       valueClass={alerts > 0 ? "text-red-400" : "text-emerald-400"} sub={alerts > 0 ? "Requires attention" : "All clear"} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                    <div className="py-3 px-5 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">Live Fleet Map · Nigeria</p>
                      <div className="flex gap-4 text-xs text-[var(--muted)]">
                        {[["bg-blue-600","Vehicle"],["bg-emerald-500","Destination"]].map(([c,l]) => (
                          <span key={l} className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", c)} />{l}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="h-[260px] sm:h-[300px] lg:h-[330px]">
                      <NigeriaMap
                        trucks={trucks}
                        selectedId={selId}
                        onSelect={(id) => { setSelId(id); openDetail(id); }}
                      />
                    </div>
                  </div>

                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                    <div className="py-3 px-5 border-b border-[var(--border)]">
                      <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">All Trucks</p>
                    </div>
                    <div className="overflow-y-auto h-[330px]">
                      {trucks.length === 0 ? (
                        <p className="text-sm text-[var(--subtle)] p-5">No trucks found.</p>
                      ) : (
                        trucks.map((t) => (
                          <TruckListItem key={t.id} truck={t} onClick={() => openDetail(t.id)} />
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm">
                  <div className="py-4 px-5 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">Fuel Monitoring · All Trucks</p>
                      <p className="text-xs text-[var(--subtle)] mt-0.5">Current fuel level — click a bar for details</p>
                    </div>
                    <div className="flex gap-4 text-xs text-[var(--muted)]">
                      {[["bg-emerald-500","Normal >50%"],["bg-orange-400","Low 20–50%"],["bg-red-500","Critical <20%"]].map(([c,l]) => (
                        <span key={l} className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-sm", c)} />{l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex gap-4 items-end h-28">
                      {trucks.map((t) => (
                        <div key={t.id} onClick={() => openDetail(t.id)} className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group">
                          <span className={cn("text-xs font-mono font-bold group-hover:scale-110 transition-transform tabular-nums", fuelText(t.fuel))}>
                            {t.fuel}%
                          </span>
                          <div className="w-full bg-[var(--surface-2)] rounded-lg h-20 flex items-end overflow-hidden">
                            <div className={cn("w-full rounded-lg transition-all duration-700", fuelTw(t.fuel))} style={{ height: `${t.fuel}%` }} />
                          </div>
                          <span className="text-[10px] text-[var(--subtle)] font-mono">{t.id.slice(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        onLogout={onLogout}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
      />
    </div>
  );
}

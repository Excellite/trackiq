"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Settings, CheckCircle2, AlertTriangle, Info } from "lucide-react";
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

  // ── Operational metrics ────────────────────────────────────────────────────
  const DIESEL_NGN  = 1_250;            // ₦/L (Nigerian diesel 2025/2026)
  const TANK_L      = 400;              // standard tank capacity
  const BASE_L100: Record<string, number> = { truck: 42, trailer: 52, bus: 28, car: 13 };

  const moving   = trucks.filter((t) => t.status === "moving").length;
  const alerts   = trucks.filter((t) => t.status === "alert").length;
  const idleCount = trucks.filter((t) => t.status === "idle").length;
  const offlineCount = trucks.filter((t) => t.status === "offline").length;
  const today    = new Date().toISOString().split("T")[0];

  const geofenceBreaches = useMemo(
    () => trucks.filter((t) => checkGeofence(t.id, t.lat, t.lng)?.breached),
    [trucks]
  );
  const overdueService = trucks.filter((t) => t.nextService && t.nextService < today);
  const dueSoonService = trucks.filter((t) => {
    if (!t.nextService || t.nextService < today) return false;
    return (new Date(t.nextService).getTime() - Date.now()) / 86_400_000 <= 14;
  });

  const avgFuel: string | number = trucks.length
    ? (trucks.reduce((a, t) => a + t.fuel, 0) / trucks.length).toFixed(0)
    : summary?.avgFuel ?? "—";

  const avgSpd = moving
    ? +(trucks.filter((t) => t.status === "moving").reduce((a, t) => a + t.speed, 0) / moving).toFixed(0)
    : summary?.avgSpeed ?? 0;

  // Fleet utilization % (moving / non-offline)
  const operational  = trucks.length - offlineCount;
  const utilization  = operational > 0 ? Math.round((moving / operational) * 100) : 0;

  // Speed violations (over Nigerian highway limit 100 km/h)
  const speedViolations = trucks.filter((t) => t.speed > 100).length;

  // Estimated daily fuel spend ₦ (moving trucks × assumed 200 km/day)
  const dailyFuelSpend = trucks
    .filter((t) => t.status === "moving")
    .reduce((s, t) => s + (BASE_L100[t.vehicle_type] ?? 38) * 200 / 100 * DIESEL_NGN, 0);
  const fmtNaira = (n: number) =>
    n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : `₦${Math.round(n / 1_000)}k`;

  // Average range remaining across all trucks
  const avgRange = trucks.length
    ? Math.round(trucks.reduce((s, t) => s + (t.fuel * TANK_L / 100) * 100 / (BASE_L100[t.vehicle_type] ?? 38), 0) / trucks.length)
    : 0;

  // Maintenance compliance %
  const maintCompliance = trucks.length
    ? Math.round(((trucks.length - overdueService.length) / trucks.length) * 100)
    : 100;

  // Composite fleet health score → grade
  const healthScore = useMemo(() => {
    if (!trucks.length) return 100;
    const fuel  = +avgFuel >= 50 ? 30 : +avgFuel >= 25 ? 18 : 6;
    const alert = alerts === 0 ? 30 : Math.max(0, 30 - alerts * 8);
    const maint = overdueService.length === 0 ? (dueSoonService.length === 0 ? 20 : 14) : 4;
    const util  = utilization >= 70 ? 20 : utilization >= 50 ? 14 : 8;
    return fuel + alert + maint + util;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trucks, alerts, overdueService.length, dueSoonService.length, utilization, avgFuel]);

  const healthGrade  = healthScore >= 90 ? "A" : healthScore >= 75 ? "B" : healthScore >= 60 ? "C" : "D";
  const gradeColour  = healthGrade === "A" ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                     : healthGrade === "B" ? "text-blue-600 bg-blue-50 border-blue-200"
                     : healthGrade === "C" ? "text-orange-600 bg-orange-50 border-orange-200"
                     : "text-red-600 bg-red-50 border-red-200";

  // Priority action items (ops manager to-do list)
  const priorityActions = useMemo(() => {
    const items: Array<{ level: "critical" | "warning" | "info"; text: string; nav: string }> = [];
    if (alerts > 0)
      items.push({ level: "critical", text: `${alerts} vehicle${alerts > 1 ? "s" : ""} in ALERT status — immediate action required`, nav: "map" });
    const critFuel = trucks.filter((t) => t.fuel < 15);
    if (critFuel.length)
      items.push({ level: "critical", text: `Critical fuel: ${critFuel.map((t) => t.id).slice(0, 3).join(", ")}${critFuel.length > 3 ? ` +${critFuel.length - 3}` : ""} — dispatch refuel`, nav: "fuel" });
    if (overdueService.length)
      items.push({ level: "critical", text: `${overdueService.length} vehicle${overdueService.length > 1 ? "s" : ""} overdue for scheduled service`, nav: "maintenance" });
    if (speedViolations)
      items.push({ level: "warning", text: `${speedViolations} vehicle${speedViolations > 1 ? "s" : ""} exceeding 100 km/h highway limit`, nav: "map" });
    if (geofenceBreaches.length)
      items.push({ level: "warning", text: `${geofenceBreaches.length} vehicle${geofenceBreaches.length > 1 ? "s" : ""} outside assigned operational zones`, nav: "map" });
    if (dueSoonService.length && !overdueService.length)
      items.push({ level: "info", text: `${dueSoonService.length} vehicle${dueSoonService.length > 1 ? "s" : ""} due for service within 14 days — schedule now`, nav: "maintenance" });
    if (idleCount > 3)
      items.push({ level: "info", text: `${idleCount} vehicles idle — est. ₦${Math.round(idleCount * 1.5 * DIESEL_NGN).toLocaleString()}/hr in idle fuel burn`, nav: "trucks" });
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trucks, alerts, overdueService.length, dueSoonService.length, speedViolations, geofenceBreaches.length, idleCount]);

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

                {/* Status bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-[var(--subtle)]">
                    {lastUpdated
                      ? `Last updated ${lastUpdated.toLocaleTimeString("en-NG")} · Auto-refresh ${refreshInterval / 1000}s`
                      : "Loading fleet data…"}
                  </p>
                  <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-lg border", gradeColour)}>
                    Fleet Health: {healthGrade} &nbsp;·&nbsp; {healthScore}/100
                  </span>
                </div>

                {/* 4 primary operational KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KPICard
                    icon="🚛"
                    label="Fleet Utilisation"
                    value={`${utilization}%`}
                    valueClass={utilization >= 70 ? "text-emerald-500" : utilization >= 50 ? "text-orange-500" : "text-red-500"}
                    sub={`${moving} moving · ${idleCount} idle · ${offlineCount} offline`}
                    onClick={() => setActiveNav("trucks")}
                  />
                  <KPICard
                    icon="⛽"
                    label="Est. Daily Fuel Spend"
                    value={fmtNaira(dailyFuelSpend)}
                    valueClass="text-orange-500"
                    sub={`@₦${DIESEL_NGN.toLocaleString()}/L · ${moving} active trucks`}
                    onClick={() => setActiveNav("fuel")}
                  />
                  <KPICard
                    icon="🔧"
                    label="Maintenance Compliance"
                    value={`${maintCompliance}%`}
                    valueClass={maintCompliance === 100 ? "text-emerald-500" : maintCompliance >= 85 ? "text-orange-500" : "text-red-500"}
                    sub={overdueService.length > 0 ? `${overdueService.length} overdue · act now` : dueSoonService.length > 0 ? `${dueSoonService.length} due within 14 days` : "All services current"}
                    onClick={() => setActiveNav("maintenance")}
                  />
                  <KPICard
                    icon="⚠️"
                    label="Active Alerts"
                    value={alerts}
                    valueClass={alerts > 0 ? "text-red-500" : "text-emerald-500"}
                    sub={alerts > 0 ? `${speedViolations} speed · ${geofenceBreaches.length} geofence` : "All vehicles nominal"}
                    onClick={() => alerts > 0 ? openDetail(trucks.find((t) => t.status === "alert")?.id) : undefined}
                  />
                </div>

                {/* Fleet Command Centre */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">Operations Command Centre</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                      <span>Avg Range: <strong className="text-[var(--text)]">{avgRange} km</strong></span>
                      <span>Avg Speed: <strong className="text-[var(--text)]">{avgSpd} km/h</strong></span>
                      <span>Avg Fuel: <strong className={fuelText(+avgFuel)}>{avgFuel}%</strong></span>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Left: 6 operational metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        {
                          label: "Speed Violations",
                          value: speedViolations,
                          sub: "> 100 km/h limit",
                          urgent: speedViolations > 0,
                          nav: "map",
                        },
                        {
                          label: "Geofence Breaches",
                          value: geofenceBreaches.length,
                          sub: "Outside assigned zone",
                          urgent: geofenceBreaches.length > 0,
                          nav: "map",
                        },
                        {
                          label: "Offline Vehicles",
                          value: offlineCount,
                          sub: "No GPS signal",
                          urgent: offlineCount > 0,
                          nav: "trucks",
                        },
                        {
                          label: "Idle Burn Cost",
                          value: fmtNaira(idleCount * 1.5 * DIESEL_NGN),
                          sub: `${idleCount} idle · est. /hr`,
                          urgent: idleCount > 3,
                          nav: "trucks",
                        },
                        {
                          label: "Critical Fuel",
                          value: trucks.filter((t) => t.fuel < 15).length,
                          sub: "< 15% — refuel now",
                          urgent: trucks.filter((t) => t.fuel < 15).length > 0,
                          nav: "fuel",
                        },
                        {
                          label: "Overdue Service",
                          value: overdueService.length,
                          sub: "Past due date",
                          urgent: overdueService.length > 0,
                          nav: "maintenance",
                        },
                      ].map(({ label, value, sub, urgent, nav }) => (
                        <button
                          key={label}
                          onClick={() => setActiveNav(nav)}
                          className={cn(
                            "rounded-xl p-3 border text-left transition-all hover:shadow-sm",
                            urgent
                              ? "border-red-200 bg-red-50/50 hover:bg-red-50"
                              : "border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)]"
                          )}
                        >
                          <p className="text-[10px] text-[var(--subtle)] uppercase tracking-wide">{label}</p>
                          <p className={cn("text-2xl font-bold font-mono tabular-nums mt-0.5", urgent ? "text-red-600" : "text-[var(--text)]")}>
                            {value}
                          </p>
                          <p className="text-[10px] text-[var(--muted)] mt-0.5">{sub}</p>
                        </button>
                      ))}
                    </div>

                    {/* Right: Priority Actions */}
                    <div>
                      <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Priority Actions</p>
                      {priorityActions.length === 0 ? (
                        <div className="flex items-center gap-2 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-700">All systems nominal</p>
                            <p className="text-xs text-emerald-600 mt-0.5">No immediate action required</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {priorityActions.slice(0, 5).map((action, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveNav(action.nav)}
                              className={cn(
                                "w-full text-left flex items-start gap-2.5 p-3 rounded-xl border transition-all hover:shadow-sm",
                                action.level === "critical"
                                  ? "border-red-200 bg-red-50/50 hover:bg-red-50"
                                  : action.level === "warning"
                                  ? "border-orange-200 bg-orange-50/50 hover:bg-orange-50"
                                  : "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                              )}
                            >
                              {action.level === "critical"
                                ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                : action.level === "warning"
                                ? <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                                : <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                              <div className="min-w-0">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wide",
                                  action.level === "critical" ? "text-red-500" : action.level === "warning" ? "text-orange-500" : "text-blue-500"
                                )}>
                                  {action.level}
                                </span>
                                <p className="text-xs text-[var(--text)] mt-0.5 leading-relaxed">{action.text}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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

"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Trip } from "@/lib/store";
import type { Truck } from "@/data/trucks";
import type { Alert } from "@/app/api/notifications/route";

type Range   = "week" | "month" | "30d" | "all";
type ColSort = "grade" | "trips" | "distance" | "fuel" | "status";

const TODAY = new Date().toISOString().split("T")[0];

function rangeStart(r: Range): Date | null {
  const now = new Date();
  if (r === "week")  { const d = new Date(now); d.setDate(d.getDate() - 7);  return d; }
  if (r === "month") { const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0); return d; }
  if (r === "30d")   { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  return null;
}

function tripAvgSpeed(distKm: number, start: string, end: string | null | undefined): number {
  if (!end || !distKm) return 0;
  const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  return hrs > 0 ? +(distKm / hrs).toFixed(1) : 0;
}

function computeGrade(
  trips: number, avgSpd: number, fuel: number,
  status: string, nextService: string | null | undefined, alertCount: number
): "A" | "B" | "C" | "D" {
  const offline      = status === "offline";
  const maintOverdue = nextService ? nextService < TODAY : false;
  if (offline || maintOverdue)               return "D";
  if (trips === 0 && (fuel < 20 || alertCount > 0)) return "D";
  if (trips === 0)                           return "C";
  if (fuel < 20 || alertCount >= 2)          return "C";
  if (trips >= 4 && avgSpd > 0 && avgSpd <= 90 && fuel >= 30 && alertCount === 0) return "A";
  if (trips >= 2)                            return "B";
  return "C";
}

const GRADE_CHIP: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-sky-50     text-sky-700    border-sky-200",
  C: "bg-orange-50  text-orange-600 border-orange-200",
  D: "bg-red-50     text-red-600    border-red-200",
};

const STATUS_CHIP: Record<string, string> = {
  moving:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  idle:    "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
  offline: "bg-red-50     text-red-600    border-red-200",
  alert:   "bg-orange-50  text-orange-600 border-orange-200",
};

function FuelBar({ pct }: { pct: number }) {
  const color = pct < 20 ? "bg-red-500" : pct < 40 ? "bg-orange-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={cn("text-[11px] font-mono font-semibold tabular-nums",
        pct < 20 ? "text-red-500" : pct < 40 ? "text-orange-500" : "text-[var(--text)]")}>
        {pct}%
      </span>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h] ?? "";
        return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
      }).join(",")
    ),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ReportsPage({ trucks, onSelectTruck }: { trucks: Truck[]; onSelectTruck: (id: string) => void }) {
  const [trips,   setTrips]   = useState<Trip[]>([]);
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState<Range>("30d");
  const [colSort, setColSort] = useState<ColSort>("grade");

  useEffect(() => {
    Promise.all([
      fetch("/api/trips").then((r) => r.json()),
      fetch("/api/notifications").then((r) => r.json()),
    ]).then(([tj, aj]) => {
      setTrips(tj.data ?? []);
      setAlerts(aj.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  // ── indexes ──────────────────────────────────────────────────────────────────

  const truckIndex = useMemo(() => {
    const m: Record<string, Truck> = {};
    for (const t of trucks) m[t.id] = t;
    return m;
  }, [trucks]);

  const alertsByTruck = useMemo(() => {
    const m: Record<string, Alert[]> = {};
    for (const a of alerts) { if (!m[a.truck_id]) m[a.truck_id] = []; m[a.truck_id].push(a); }
    return m;
  }, [alerts]);

  const cutoff    = useMemo(() => rangeStart(range), [range]);
  const completed = useMemo(() =>
    trips.filter((t) => t.status === "completed" && (!cutoff || new Date(t.started_at) >= cutoff)),
  [trips, cutoff]);
  const active = useMemo(() => trips.filter((t) => t.status === "active"), [trips]);

  // Trip stats per truck (period)
  const tripStats = useMemo(() => {
    const m: Record<string, { trips: number; km: number; speedSum: number; speedCount: number }> = {};
    for (const t of completed) {
      if (!m[t.truck_id]) m[t.truck_id] = { trips: 0, km: 0, speedSum: 0, speedCount: 0 };
      const s = tripAvgSpeed(t.distance_km, t.started_at, t.ended_at);
      m[t.truck_id].trips++;
      m[t.truck_id].km += t.distance_km;
      if (s > 0) { m[t.truck_id].speedSum += s; m[t.truck_id].speedCount++; }
    }
    return m;
  }, [completed]);

  // ── unified fleet rows (trips + live truck state + alerts + maintenance) ─────

  const fleetRows = useMemo(() => {
    return trucks.map((truck) => {
      const stats        = tripStats[truck.id] ?? { trips: 0, km: 0, speedSum: 0, speedCount: 0 };
      const truckAlerts  = alertsByTruck[truck.id] ?? [];
      const avgSpd       = stats.speedCount ? +(stats.speedSum / stats.speedCount).toFixed(1) : 0;
      const maintOverdue = truck.nextService ? truck.nextService < TODAY : false;
      const maintSoon    = !maintOverdue && truck.nextService
        ? new Date(truck.nextService).getTime() - Date.now() < 30 * 86_400_000
        : false;
      return {
        id:           truck.id,
        name:         truck.name,
        plate:        truck.plate,
        driver:       truck.driver,
        status:       truck.status,
        fuel:         truck.fuel,
        speed:        truck.speed,
        trips:        stats.trips,
        km:           +stats.km.toFixed(1),
        avgSpd,
        alertCount:   truckAlerts.length,
        topAlert:     truckAlerts[0] ?? null,
        maintOverdue,
        maintSoon,
        nextService:  truck.nextService ?? null,
        grade:        computeGrade(stats.trips, avgSpd, truck.fuel, truck.status, truck.nextService, truckAlerts.length),
      };
    });
  }, [trucks, tripStats, alertsByTruck]);

  const GRADE_ORDER = { A: 0, B: 1, C: 2, D: 3 } as const;

  const sortedFleet = useMemo(() => {
    const rows = [...fleetRows];
    if (colSort === "grade")    return rows.sort((a, b) => GRADE_ORDER[b.grade] - GRADE_ORDER[a.grade]);
    if (colSort === "trips")    return rows.sort((a, b) => b.trips - a.trips);
    if (colSort === "distance") return rows.sort((a, b) => b.km - a.km);
    if (colSort === "fuel")     return rows.sort((a, b) => a.fuel - b.fuel);
    if (colSort === "status")   return rows.sort((a, b) => a.status.localeCompare(b.status));
    return rows;
  }, [fleetRows, colSort]);

  // ── fleet-level KPIs ─────────────────────────────────────────────────────────

  const totalKm   = +completed.reduce((a, t) => a + t.distance_km, 0).toFixed(1);
  const moving    = trucks.filter((t) => t.status === "moving").length;
  const offline   = trucks.filter((t) => t.status === "offline").length;
  const avgFuel   = trucks.length ? +(trucks.reduce((a, t) => a + t.fuel, 0) / trucks.length).toFixed(0) : 0;
  const criticals = alerts.filter((a) => a.severity === "critical");
  const warnings  = alerts.filter((a) => a.severity === "warning");
  const rangeLabel = { week: "this week", month: "this month", "30d": "last 30 days", all: "all time" }[range];

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Fleet Report</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {loading
              ? "Loading…"
              : `${moving} moving · ${offline} offline · ${completed.length} trips · ${totalKm} km — ${rangeLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {(["week","month","30d","all"] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                range === r
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-orange-300"
              )}>
              {r === "week" ? "Week" : r === "month" ? "Month" : r === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
          <button
            onClick={() => exportCSV(
              sortedFleet.map((r) => ({
                truck:         r.name,
                plate:         r.plate,
                driver:        r.driver,
                status:        r.status,
                fuel_pct:      r.fuel,
                trips:         r.trips,
                dist_km:       r.km,
                avg_speed_kmh: r.avgSpd,
                alerts:        r.alertCount,
                maint_overdue: r.maintOverdue ? "Yes" : "No",
                next_service:  r.nextService ?? "",
                grade:         r.grade,
              })),
              "fleet-report.csv"
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-orange-300 hover:text-[var(--text)] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {([
          { label: "Trips Completed", value: completed.length,                              hl: false },
          { label: "Distance Covered", value: `${totalKm} km`,                             hl: false },
          { label: "Moving Now",      value: `${moving} / ${trucks.length}`,               hl: moving > 0 },
          { label: "Avg Fuel",        value: `${avgFuel}%`,                                hl: avgFuel < 30 },
          { label: "Open Alerts",     value: alerts.length,                                hl: alerts.length > 0 },
        ] as { label: string; value: string | number; hl: boolean }[]).map(({ label, value, hl }) => (
          <div key={label} className={cn(
            "bg-[var(--surface)] border rounded-xl px-4 py-3 shadow-sm",
            hl ? "border-orange-200" : "border-[var(--border)]"
          )}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--subtle)] font-semibold">{label}</p>
            <p className={cn("text-xl font-bold mt-0.5", hl ? "text-orange-500" : "text-[var(--text)]")}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Alerts + Active trips ──────────────────────────────────────────────── */}
      <div className={cn("grid gap-4", active.length > 0 ? "md:grid-cols-2" : "grid-cols-1")}>

        {/* Alerts / healthy */}
        {!loading && (alerts.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-5 py-4 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Fleet is healthy</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">No critical alerts or warnings right now.</p>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-sub)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-semibold text-[var(--text)]">Needs Attention</p>
              <span className="ml-auto flex gap-2">
                {criticals.length > 0 && <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">{criticals.length} critical</span>}
                {warnings.length  > 0 && <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">{warnings.length} warning</span>}
              </span>
            </div>
            <div className="divide-y divide-[var(--border-sub)] max-h-52 overflow-y-auto">
              {[...criticals, ...warnings].map((a) => {
                const truck = truckIndex[a.truck_id];
                return (
                  <button key={a.id} onClick={() => onSelectTruck(a.truck_id)}
                    className="w-full flex items-start gap-3 px-5 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left">
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                      a.severity === "critical" ? "bg-red-500" : "bg-orange-400")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-[var(--text)]">{a.title}</p>
                        {truck && <span className="text-[10px] text-[var(--subtle)] font-mono">{truck.name} · {truck.plate}</span>}
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5 line-clamp-1">{a.message}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Active trips */}
        {active.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-sub)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-semibold text-[var(--text)]">Active Right Now</p>
              <span className="ml-auto text-[11px] font-mono text-emerald-600">{active.length} on road</span>
            </div>
            <div className="divide-y divide-[var(--border-sub)] max-h-52 overflow-y-auto">
              {active.map((t) => {
                const truck = truckIndex[t.truck_id];
                return (
                  <button key={t.id} onClick={() => onSelectTruck(t.truck_id)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text)]">
                        {truck?.name ?? t.truck_id}
                        <span className="font-mono font-normal text-[var(--subtle)] ml-1.5">{truck?.plate}</span>
                      </p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {truck?.driver ?? "—"} · started {fmtTime(t.started_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-bold text-emerald-600">{t.distance_km.toFixed(1)} km</p>
                      {truck && <p className="text-[10px] text-[var(--subtle)]">{truck.speed} km/h</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Unified fleet health table ─────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-sub)] flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-[var(--text)]">
            Fleet Health — All {trucks.length} Trucks
          </p>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[var(--muted)] mr-1">Sort</span>
            {(["grade","trips","distance","fuel","status"] as ColSort[]).map((s) => (
              <button key={s} onClick={() => setColSort(s)}
                className={cn(
                  "px-2 py-0.5 rounded font-semibold capitalize transition-colors",
                  colSort === s ? "bg-orange-500 text-white" : "text-[var(--muted)] hover:text-[var(--text)]"
                )}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-sub)] bg-[var(--surface-2)]">
                {["Truck / Driver", "Status", "Trips", "Distance", "Avg Speed", "Live Fuel", "Alerts", "Next Service", "Grade"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-[var(--subtle)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedFleet.map((r) => (
                <tr key={r.id} onClick={() => onSelectTruck(r.id)}
                  className={cn(
                    "border-b border-[var(--border-sub)] cursor-pointer transition-colors",
                    r.grade === "D" ? "hover:bg-red-50/40 bg-red-50/20" : "hover:bg-[var(--surface-2)]"
                  )}>

                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--text)]">{r.name}</p>
                    <p className="font-mono text-[10px] text-[var(--subtle)]">{r.plate}</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">{r.driver}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize",
                      STATUS_CHIP[r.status] ?? STATUS_CHIP.idle)}>
                      {r.status}
                    </span>
                    {r.speed > 0 && (
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">{r.speed} km/h</p>
                    )}
                  </td>

                  <td className="px-4 py-3 font-mono text-[var(--text)]">{r.trips}</td>

                  <td className="px-4 py-3 text-[var(--text)]">{r.km > 0 ? `${r.km} km` : "—"}</td>

                  <td className="px-4 py-3 text-[var(--text)]">{r.avgSpd > 0 ? `${r.avgSpd} km/h` : "—"}</td>

                  <td className="px-4 py-3"><FuelBar pct={r.fuel} /></td>

                  <td className="px-4 py-3">
                    {r.alertCount > 0 ? (
                      <div>
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                          {r.alertCount} alert{r.alertCount > 1 ? "s" : ""}
                        </span>
                        {r.topAlert && (
                          <p className="text-[10px] text-[var(--muted)] mt-0.5 max-w-[120px] truncate">{r.topAlert.title}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--subtle)]">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {r.maintOverdue ? (
                      <span className="text-[10px] font-semibold text-red-600">Overdue</span>
                    ) : r.maintSoon ? (
                      <span className="text-[10px] font-semibold text-orange-500">{r.nextService}</span>
                    ) : r.nextService ? (
                      <span className="text-[10px] text-[var(--subtle)]">{r.nextService}</span>
                    ) : (
                      <span className="text-[var(--subtle)]">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded border", GRADE_CHIP[r.grade])}>
                      {r.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-2.5 border-t border-[var(--border-sub)] bg-[var(--surface-2)] flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--subtle)]">
          <span><strong className="text-emerald-700">A</strong> — 4+ trips, fuel OK, no alerts</span>
          <span><strong className="text-sky-700">B</strong> — 2–3 trips, no major issues</span>
          <span><strong className="text-orange-600">C</strong> — low activity or minor alerts</span>
          <span><strong className="text-red-600">D</strong> — idle, offline, overdue maintenance, or critical alerts</span>
        </div>
      </div>

      {/* ── Trip log ──────────────────────────────────────────────────────────── */}
      {completed.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-sub)]">
            <p className="text-sm font-semibold text-[var(--text)]">
              Trip Log
              <span className="text-[var(--subtle)] font-normal ml-1">
                — last {Math.min(completed.length, 20)} of {completed.length} completed
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-sub)] bg-[var(--surface-2)]">
                  {["Truck", "Driver", "Date", "Time", "Distance", "Avg Speed", "Fuel Used"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold text-[var(--subtle)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...completed]
                  .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                  .slice(0, 20)
                  .map((t) => {
                    const truck    = truckIndex[t.truck_id];
                    const spd      = tripAvgSpeed(t.distance_km, t.started_at, t.ended_at);
                    const fuelUsed = t.fuel_end != null ? +(t.fuel_start - t.fuel_end).toFixed(1) : null;
                    return (
                      <tr key={t.id} onClick={() => onSelectTruck(t.truck_id)}
                        className="border-b border-[var(--border-sub)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[var(--text)]">{truck?.name ?? t.truck_id}</p>
                          <p className="font-mono text-[10px] text-[var(--subtle)]">{truck?.plate}</p>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--muted)]">{truck?.driver ?? "—"}</td>
                        <td className="px-4 py-2.5 text-[var(--muted)] whitespace-nowrap">{fmtDate(t.started_at)}</td>
                        <td className="px-4 py-2.5 text-[var(--muted)] whitespace-nowrap">{fmtTime(t.started_at)}</td>
                        <td className="px-4 py-2.5 font-semibold text-[var(--text)]">{t.distance_km.toFixed(1)} km</td>
                        <td className="px-4 py-2.5 text-[var(--text)]">{spd > 0 ? `${spd} km/h` : "—"}</td>
                        <td className="px-4 py-2.5">
                          {fuelUsed != null
                            ? <span className={fuelUsed > 0 ? "text-orange-500 font-semibold" : "text-[var(--muted)]"}>
                                {fuelUsed > 0 ? `−${fuelUsed}%` : "±0"}
                              </span>
                            : <span className="text-[var(--subtle)]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

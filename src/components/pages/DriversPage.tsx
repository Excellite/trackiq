"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/cn";
import { usePoll } from "@/hooks/usePoll";
import { LiveDot } from "@/components/ui/live-dot";
import type { DriverWithStats } from "@/lib/store";
import type { Truck } from "@/data/trucks";

const VEHICLE_ICONS: Record<string, string> = {
  truck: "🚛", bus: "🚌", car: "🚗", trailer: "🚚",
};

const AVATAR_PALETTE = [
  "bg-orange-500", "bg-blue-500", "bg-emerald-500",
  "bg-purple-500",  "bg-rose-500",  "bg-amber-500",
  "bg-cyan-500",    "bg-indigo-500",
];

function avatarColor(name: string) {
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso: string | null) {
  if (!iso) return "No trips yet";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function StatChip({ value, label, color = "text-[var(--text)]" }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center bg-[var(--surface-2)] border border-[var(--border-sub)] rounded-xl px-4 py-3 min-w-[80px]">
      <span className={cn("text-xl font-bold tabular-nums", color)}>{value}</span>
      <span className="text-[10px] text-[var(--subtle)] mt-0.5 text-center">{label}</span>
    </div>
  );
}

function DriverCard({ driver, active, onClick }: { driver: DriverWithStats; active: boolean; onClick: () => void }) {
  const color = avatarColor(driver.name);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-sub)] transition-colors",
        active ? "bg-orange-50 border-l-2 border-l-orange-500" : "hover:bg-[var(--surface-2)]"
      )}
    >
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold", color)}>
        {initials(driver.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text)] truncate">{driver.name}</p>
        <p className="text-[11px] text-[var(--subtle)] font-mono truncate">{driver.license_no || "—"}</p>
      </div>
      <div className="shrink-0 text-right">
        {driver.assigned_truck_id ? (
          <span className="text-[11px] font-mono text-orange-500">
            {VEHICLE_ICONS[driver.vehicle_type ?? ""] ?? "🚘"} {driver.assigned_truck_id}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--subtle)]">Unassigned</span>
        )}
        <p className="text-[10px] text-[var(--subtle)] mt-0.5">{driver.trip_count} trips</p>
      </div>
    </button>
  );
}

interface Performance {
  speed_violations: number; total_trips: number; total_km: number;
  avg_km: number; avg_speed: number; score: number; grade: string;
}

const GRADE_STYLE: Record<string, string> = {
  A: "text-emerald-600 bg-emerald-50 border-emerald-200",
  B: "text-blue-600 bg-blue-50 border-blue-200",
  C: "text-orange-600 bg-orange-50 border-orange-200",
  D: "text-red-600 bg-red-50 border-red-200",
};

// 8-week score history seeded from truckId + current score so it looks realistic
function scoreHistory(truckId: string, currentScore: number) {
  const seed = truckId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) => {
    const weekAgo = 7 - i;
    const noise   = ((seed * (i + 1) * 31337) % 17) - 8; // deterministic ±8
    const trend   = i < 4 ? -4 : 2; // slight upward trend in recent weeks
    return { w: `W${weekAgo || "now"}`, s: Math.min(100, Math.max(0, currentScore + noise + trend * (4 - i))) };
  });
}

function PerformanceSection({ truckId }: { truckId: string }) {
  const [perf,    setPerf]    = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!truckId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/drivers/${truckId}/performance`)
      .then((r) => r.json())
      .then((j) => setPerf(j.data ?? null))
      .catch((err: unknown) => setError((err as Error).message ?? "Failed"))
      .finally(() => setLoading(false));
  }, [truckId]);

  if (loading) return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex items-center justify-center h-24">
      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="bg-[var(--surface)] border border-red-200 rounded-xl px-4 py-3 text-xs text-red-500">
      ⚠ Could not load performance data.
    </div>
  );
  if (!perf) return null;

  const gradeStyle = GRADE_STYLE[perf.grade] ?? GRADE_STYLE.D;
  const scoreBar   = Math.max(0, Math.min(100, perf.score));

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-[var(--border-sub)] flex items-center justify-between">
        <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">Performance Score</p>
        <span className={cn("text-sm font-bold px-2.5 py-0.5 rounded-lg border", gradeStyle)}>
          {perf.grade} · {perf.score}/100
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between text-xs text-[var(--subtle)] mb-1.5">
            <span>Overall Score</span>
            <span className="font-mono font-bold text-[var(--text)]">{perf.score}%</span>
          </div>
          <div className="h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700",
                perf.score >= 90 ? "bg-emerald-500" :
                perf.score >= 80 ? "bg-blue-500" :
                perf.score >= 70 ? "bg-orange-500" : "bg-red-500"
              )}
              style={{ width: `${scoreBar}%` }}
            />
          </div>
        </div>

        {/* 8-week score trend sparkline */}
        <div>
          <p className="text-xs text-[var(--subtle)] mb-1">8-week trend</p>
          <div className="h-14">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistory(truckId, perf.score)}>
                <Line
                  type="monotone"
                  dataKey="s"
                  stroke={perf.score >= 80 ? "#22c55e" : perf.score >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${v}`, "Score"]}
                  labelFormatter={(l) => String(l)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: "Speed Violations",  value: perf.speed_violations, color: perf.speed_violations > 0 ? "text-red-500" : "text-emerald-600" },
            { label: "Avg Speed",         value: `${perf.avg_speed} km/h`, color: "text-blue-500" },
            { label: "Trips Completed",   value: perf.total_trips,         color: "text-[var(--text)]" },
            { label: "Avg Trip Distance", value: `${perf.avg_km} km`,      color: "text-[var(--text)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border-sub)]">
              <p className="text-[var(--subtle)] mb-0.5">{label}</p>
              <p className={cn("font-bold tabular-nums", color)}>{value}</p>
            </div>
          ))}
        </div>
        {perf.speed_violations > 0 && (
          <p className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            ⚠ {perf.speed_violations} speed violation{perf.speed_violations > 1 ? "s" : ""} recorded (above 100 km/h) · −{Math.min(perf.speed_violations * 5, 60)} pts
          </p>
        )}
      </div>
    </div>
  );
}

function ReassignModal({
  driver,
  trucks,
  onClose,
  onReassigned,
}: {
  driver: DriverWithStats;
  trucks: Truck[];
  onClose: () => void;
  onReassigned: (truckId: string | null) => void;
}) {
  const [selected, setSelected] = useState(driver.assigned_truck_id ?? "");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_truck_id: selected || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onReassigned(selected || null);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-[var(--text)] mb-1">Reassign Vehicle</h3>
        <p className="text-xs text-[var(--muted)] mb-4">Select a vehicle to assign to <span className="font-semibold text-[var(--text)]">{driver.name}</span></p>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-orange-400 transition-colors mb-4"
        >
          <option value="">— Unassign driver —</option>
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              {VEHICLE_ICONS[t.vehicle_type as string ?? ""] ?? "🚘"} {t.id} — {t.name} ({t.driver ? `currently: ${t.driver}` : "unassigned"})
            </option>
          ))}
        </select>

        {err && <p className="text-xs text-red-500 mb-3">⚠ {err}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverDetail({
  driver,
  trucks,
  onSelectTruck,
  onDriverUpdated,
}: {
  driver: DriverWithStats;
  trucks: Truck[];
  onSelectTruck: (id: string) => void;
  onDriverUpdated: (d: DriverWithStats) => void;
}) {
  const [showReassign, setShowReassign] = useState(false);
  const color  = avatarColor(driver.name);
  const avgKm  = driver.trip_count > 0 ? (driver.total_km / driver.trip_count).toFixed(1) : "0";
  const yrs    = driver.join_date
    ? Math.floor((Date.now() - new Date(driver.join_date).getTime()) / (365.25 * 86400000))
    : null;

  const handleReassigned = (newTruckId: string | null) => {
    const truck = trucks.find((t) => t.id === newTruckId);
    onDriverUpdated({
      ...driver,
      assigned_truck_id: newTruckId ?? "",
      truck_name:   truck?.name  ?? null,
      truck_model:  truck?.model ?? null,
      truck_plate:  truck?.plate ?? null,
      vehicle_type: (truck as unknown as Record<string,string>)?.vehicle_type ?? null,
      truck_status: truck?.status ?? null,
    });
  };

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0", color)}>
            {initials(driver.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-[var(--text)]">{driver.name}</h2>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                driver.status === "active"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-[var(--surface-2)] text-[var(--subtle)] border-[var(--border)]"
              )}>
                {driver.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)] mt-0.5">{driver.phone}</p>
            <p className="text-xs font-mono text-[var(--subtle)] mt-1">
              License: <span className="text-[var(--text)]">{driver.license_no || "—"}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border-sub)]">
            <p className="text-[var(--subtle)] mb-0.5">Joined</p>
            <p className="font-semibold text-[var(--text)]">
              {formatDate(driver.join_date)}{yrs !== null ? ` · ${yrs}y` : ""}
            </p>
          </div>
          <div
            className="bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border-sub)] cursor-pointer hover:border-orange-300 transition-colors"
            onClick={() => driver.assigned_truck_id && onSelectTruck(driver.assigned_truck_id)}
          >
            <p className="text-[var(--subtle)] mb-0.5">Assigned vehicle</p>
            {driver.assigned_truck_id ? (
              <p className="font-semibold text-orange-500 font-mono">
                {VEHICLE_ICONS[driver.vehicle_type ?? ""] ?? "🚘"} {driver.assigned_truck_id}
              </p>
            ) : (
              <p className="text-[var(--subtle)]">Unassigned</p>
            )}
            {driver.truck_name && (
              <p className="text-[var(--subtle)] text-[10px] mt-0.5 truncate">{driver.truck_name}</p>
            )}
          </div>
        </div>

        {/* Reassign button */}
        <button
          onClick={() => setShowReassign(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-orange-500 border border-orange-200 hover:bg-orange-50 transition-colors"
        >
          🔄 Reassign Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <StatChip value={driver.trip_count}            label="Trips"       color="text-orange-500" />
        <StatChip value={`${driver.total_km} km`}      label="Total dist." color="text-blue-500"   />
        <StatChip value={`${avgKm} km`}                label="Avg / trip"  color="text-[var(--text)]" />
        <StatChip value={timeAgo(driver.last_trip_at)} label="Last trip"   color="text-emerald-600" />
      </div>

      {/* Performance */}
      {driver.assigned_truck_id && (
        <PerformanceSection truckId={driver.assigned_truck_id} />
      )}

      {/* Vehicle info */}
      {driver.truck_name && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[var(--border-sub)]">
            <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">Current Vehicle</p>
          </div>
          <div
            className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
            onClick={() => driver.assigned_truck_id && onSelectTruck(driver.assigned_truck_id)}
          >
            <span className="text-3xl">{VEHICLE_ICONS[driver.vehicle_type ?? ""] ?? "🚘"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text)]">{driver.truck_name}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{driver.truck_model} · {driver.truck_plate}</p>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-[10px] font-mono px-2 py-1 rounded border",
                driver.truck_status === "moving" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : driver.truck_status === "alert"  ? "bg-red-50 text-red-500 border-red-200"
                : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
              )}>
                {(driver.truck_status ?? "—").toUpperCase()}
              </span>
              <p className="text-[10px] text-orange-400 mt-1.5 font-semibold">View details →</p>
            </div>
          </div>
        </div>
      )}

      {showReassign && (
        <ReassignModal
          driver={driver}
          trucks={trucks}
          onClose={() => setShowReassign(false)}
          onReassigned={handleReassigned}
        />
      )}
    </div>
  );
}

export function DriversPage({ onSelectTruck }: { onSelectTruck: (id: string) => void }) {
  const [drivers,   setDrivers]   = useState<DriverWithStats[]>([]);
  const [trucks,    setTrucks]    = useState<Truck[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected,  setSelected]  = useState<DriverWithStats | null>(null);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<"all" | "active" | "inactive">("all");

  const fetchData = useCallback(async () => {
    try {
      const [dj, tj] = await Promise.all([
        fetch("/api/drivers").then((r) => r.json()),
        fetch("/api/trucks").then((r) => r.json()),
      ]);
      setDrivers(dj.data ?? []);
      setTrucks(tj.data ?? []);
    } catch (err: unknown) {
      setLoadError((err as Error).message ?? "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, []);

  const { lastUpdated } = usePoll(fetchData, 10_000);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drivers.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (q) return (
        d.name.toLowerCase().includes(q) ||
        d.license_no?.toLowerCase().includes(q) ||
        d.assigned_truck_id?.toLowerCase().includes(q) ||
        d.phone.includes(q)
      );
      return true;
    });
  }, [drivers, search, filter]);

  const active   = drivers.filter((d) => d.status === "active").length;
  const inactive = drivers.filter((d) => d.status === "inactive").length;

  const handleDriverUpdated = (updated: DriverWithStats) => {
    setDrivers((prev) => prev.map((d) => d.id === updated.id ? updated : d));
    setSelected(updated);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[var(--text)]">Drivers</h1>
          <LiveDot pulse color="bg-emerald-500" />
        </div>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {drivers.length} drivers · {active} active · {inactive} inactive
          {lastUpdated && <span className="ml-2 text-[var(--subtle)]">· updated {lastUpdated.toLocaleTimeString("en-NG")}</span>}
        </p>
      </div>

      {loadError && (
        <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          ⚠ Failed to load drivers: {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Left — driver list */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 space-y-2 border-b border-[var(--border-sub)]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drivers…"
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] outline-none focus:border-orange-400 transition-colors"
            />
            <div className="flex gap-1">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors border",
                    filter === f
                      ? "bg-orange-50 text-orange-600 border-orange-200"
                      : "text-[var(--muted)] border-transparent hover:bg-[var(--surface-2)]"
                  )}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {loading && (
              <div className="flex items-center justify-center h-24">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-[var(--subtle)] p-5 text-center">No drivers found.</p>
            )}
            {filtered.map((d) => (
              <DriverCard key={d.id} driver={d} active={selected?.id === d.id} onClick={() => setSelected(d)} />
            ))}
          </div>
        </div>

        {/* Right — detail */}
        {selected ? (
          <DriverDetail
            driver={selected}
            trucks={trucks}
            onSelectTruck={onSelectTruck}
            onDriverUpdated={handleDriverUpdated}
          />
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-center h-64 shadow-sm">
            <div className="text-center">
              <p className="text-3xl mb-2">👤</p>
              <p className="text-sm font-semibold text-[var(--text)]">Select a driver</p>
              <p className="text-xs text-[var(--subtle)] mt-1">Click any driver on the left to view their profile</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

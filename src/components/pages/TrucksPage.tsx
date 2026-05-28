"use client";

import { useState, useMemo } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { FuelBar } from "@/components/ui/fuel-bar";
import { cn } from "@/lib/cn";
import { fuelText } from "@/lib/constants";
import type { Truck } from "@/data/trucks";

type VehicleType = "all" | "truck" | "bus" | "car" | "trailer";

const TYPE_CONFIG: Record<VehicleType, { label: string; icon: string; plural: string }> = {
  all:     { label: "All Fleet", icon: "🚘", plural: "vehicles" },
  truck:   { label: "Trucks",    icon: "🚛", plural: "trucks"   },
  bus:     { label: "Buses",     icon: "🚌", plural: "buses"    },
  car:     { label: "Cars",      icon: "🚗", plural: "cars"     },
  trailer: { label: "Trailers",  icon: "🚚", plural: "trailers" },
};

const STATUSES = ["all", "moving", "idle", "alert", "offline"] as const;
const SORTS = [
  { value: "name",  label: "Name A–Z" },
  { value: "fuel",  label: "Fuel ↑"   },
  { value: "speed", label: "Speed ↓"  },
];

function VehicleCard({ t, onClick }: { t: Truck; onClick: () => void }) {
  const overdue = new Date(`${t.nextService}T00:00:00`) < new Date();
  return (
    <div
      onClick={onClick}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3 cursor-pointer hover:border-orange-300 hover:shadow-md transition-all shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="text-xl mt-0.5">{TYPE_CONFIG[t.vehicle_type].icon}</span>
          <div>
            <p className="font-semibold text-sm text-[var(--text)]">{t.name}</p>
            <p className="text-xs text-[var(--subtle)] font-mono">{t.id} · {t.plate}</p>
          </div>
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="space-y-1 text-xs text-[var(--muted)]">
        <div className="flex justify-between">
          <span>{t.driver}</span>
          <span className="text-[var(--subtle)]">{t.model} · {t.year}</span>
        </div>
        <div className="text-[11px] text-blue-500 font-mono truncate">{t.route}</div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--subtle)]">Fuel</span>
          <div className="flex gap-3">
            <span className={cn("font-mono font-bold", fuelText(t.fuel))}>{t.fuel}%</span>
            <span className="text-[var(--subtle)] font-mono">{t.speed} km/h</span>
          </div>
        </div>
        <FuelBar pct={t.fuel} />
      </div>
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-[var(--subtle)]">ODO: {t.odometer.toLocaleString()} km</span>
        <span className={overdue ? "text-red-500" : "text-[var(--subtle)]"}>
          {overdue ? "⚠ SVC OVERDUE" : `Svc: ${t.nextService}`}
        </span>
      </div>
    </div>
  );
}

export function TrucksPage({ trucks, onSelectTruck }: { trucks: Truck[]; onSelectTruck: (id: string) => void }) {
  const [activeType, setActiveType] = useState<VehicleType>("all");
  const [search,     setSearch]     = useState("");
  const [status,     setStatus]     = useState("all");
  const [sortBy,     setSortBy]     = useState("name");

  const counts = useMemo(() => ({
    all:     trucks.length,
    truck:   trucks.filter((t) => t.vehicle_type === "truck").length,
    bus:     trucks.filter((t) => t.vehicle_type === "bus").length,
    car:     trucks.filter((t) => t.vehicle_type === "car").length,
    trailer: trucks.filter((t) => t.vehicle_type === "trailer").length,
  }), [trucks]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return trucks
      .filter((t) => {
        if (activeType !== "all" && t.vehicle_type !== activeType) return false;
        if (status !== "all" && t.status !== status) return false;
        if (q) return (
          t.name.toLowerCase().includes(q)   ||
          t.driver.toLowerCase().includes(q) ||
          t.plate.toLowerCase().includes(q)  ||
          t.id.toLowerCase().includes(q)     ||
          t.model.toLowerCase().includes(q)
        );
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "fuel")  return a.fuel  - b.fuel;
        if (sortBy === "speed") return b.speed - a.speed;
        return a.name.localeCompare(b.name);
      });
  }, [trucks, activeType, search, status, sortBy]);

  const cfg = TYPE_CONFIG[activeType];
  const sectionTypes: VehicleType[] = ["truck", "bus", "car", "trailer"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Fleet</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">{trucks.length} vehicles across 4 categories</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(TYPE_CONFIG) as VehicleType[]).map((type) => {
          const c = TYPE_CONFIG[type];
          const active = activeType === type;
          return (
            <button
              key={type}
              onClick={() => { setActiveType(type); setSearch(""); setStatus("all"); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                active
                  ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-orange-300 hover:text-[var(--text)]"
              )}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
              <span className={cn(
                "text-xs font-mono rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                active ? "bg-white/20 text-white" : "bg-[var(--surface-2)] text-[var(--subtle)]"
              )}>
                {counts[type]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${cfg.plural}…`}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] outline-none focus:border-orange-400 transition-colors min-w-[220px] shadow-sm"
        />
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors border",
                status === s ? "bg-orange-50 text-orange-600 border-orange-200" : "text-[var(--muted)] hover:bg-[var(--surface-2)] border-transparent"
              )}
            >{s}</button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-orange-400 shadow-sm">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span className="text-xs text-[var(--subtle)]">{filtered.length} {cfg.plural}</span>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--subtle)] py-10 text-center">No vehicles match your search.</p>

      ) : activeType !== "all" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((t) => <VehicleCard key={t.id} t={t} onClick={() => onSelectTruck(t.id)} />)}
        </div>

      ) : (
        <div className="space-y-8">
          {sectionTypes.map((type) => {
            const section = filtered.filter((t) => t.vehicle_type === type);
            if (section.length === 0) return null;
            const c = TYPE_CONFIG[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lg">{c.icon}</span>
                  <h2 className="text-sm font-bold text-[var(--text)]">{c.label}</h2>
                  <span className="text-xs font-mono text-[var(--subtle)] bg-[var(--surface-2)] border border-[var(--border-sub)] rounded-full px-2 py-0.5">
                    {section.length}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border-sub)]" />
                  <button
                    onClick={() => { setActiveType(type); setSearch(""); setStatus("all"); }}
                    className="text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors shrink-0"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {section.map((t) => <VehicleCard key={t.id} t={t} onClick={() => onSelectTruck(t.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

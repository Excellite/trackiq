"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FuelBar } from "@/components/ui/fuel-bar";
import { cn } from "@/lib/cn";
import { fuelText } from "@/lib/constants";
import type { Truck } from "@/data/trucks";

const STATUSES = ["all", "moving", "idle", "alert", "offline"];
const SORTS = [
  { value: "name",  label: "Name A–Z"  },
  { value: "fuel",  label: "Fuel ↑"    },
  { value: "speed", label: "Speed ↓"   },
];

export function TrucksPage({
  trucks,
  onSelectTruck,
}: {
  trucks: Truck[];
  onSelectTruck: (id: string) => void;
}) {
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("all");
  const [sortBy,  setSortBy]  = useState("name");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return trucks
      .filter((t) => {
        if (status !== "all" && t.status !== status) return false;
        if (q) return (
          t.name.toLowerCase().includes(q)   ||
          t.driver.toLowerCase().includes(q) ||
          t.plate.toLowerCase().includes(q)  ||
          t.id.toLowerCase().includes(q)
        );
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "fuel")  return a.fuel  - b.fuel;
        if (sortBy === "speed") return b.speed - a.speed;
        return a.name.localeCompare(b.name);
      });
  }, [trucks, search, status, sortBy]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">All Trucks</h1>
        <p className="text-xs text-slate-400 mt-0.5">{trucks.length} trucks in fleet</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, driver, plate…"
          className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/60 transition-colors min-w-[220px]"
        />

        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-colors border",
                status === s
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "text-slate-400 hover:bg-slate-700/40 border-transparent"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500/60"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <span className="text-xs text-slate-500">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-10 text-center">No trucks match your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((t) => {
            const overdue = new Date(`${t.nextService}T00:00:00`) < new Date();
            return (
              <Card
                key={t.id}
                onClick={() => onSelectTruck(t.id)}
                className="bg-slate-800/60 border-slate-700/50 cursor-pointer hover:bg-slate-700/60 hover:border-slate-600/60 transition-all"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-white">{t.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{t.id} · {t.plate}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>👤 {t.driver}</span>
                      <span className="text-slate-500">{t.model}</span>
                    </div>
                    <div className="text-[11px] text-blue-400 font-mono truncate">📍 {t.route}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Fuel</span>
                      <div className="flex gap-3">
                        <span className={cn("font-mono font-bold", fuelText(t.fuel))}>{t.fuel}%</span>
                        <span className="text-slate-500 font-mono">{t.speed} km/h</span>
                      </div>
                    </div>
                    <FuelBar pct={t.fuel} />
                  </div>

                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-600">ODO: {t.odometer.toLocaleString()} km</span>
                    <span className={overdue ? "text-red-400" : "text-slate-600"}>
                      {overdue ? "⚠ OVERDUE" : `Svc: ${t.nextService}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

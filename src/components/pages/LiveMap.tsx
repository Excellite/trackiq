"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NigeriaMap } from "@/components/map/NigeriaMap";
import { StatusBadge } from "@/components/ui/status-badge";
import { LiveDot } from "@/components/ui/live-dot";
import { FuelBar } from "@/components/ui/fuel-bar";
import { cn } from "@/lib/cn";
import { fuelText } from "@/lib/constants";
import type { Truck } from "@/data/trucks";

export function LiveMap({
  trucks,
  onSelectTruck,
}: {
  trucks: Truck[];
  onSelectTruck: (id: string) => void;
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const selTruck = trucks.find((t) => t.id === selId) ?? null;

  const moving = trucks.filter((t) => t.status === "moving").length;
  const alerts = trucks.filter((t) => t.status === "alert").length;
  const idle   = trucks.filter((t) => t.status === "idle").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Live Fleet Map</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time truck positions across Nigeria</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveDot pulse color="bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-mono">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        {/* Map */}
        <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-slate-700/30">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">
                Nigeria · {trucks.length} trucks tracked
              </p>
              <div className="flex gap-4 text-xs text-slate-400">
                {[["bg-emerald-400", "Moving"], ["bg-slate-500", "Idle"], ["bg-red-400", "Alert"]].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", c)} />{l}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <div className="h-[500px]">
            <NigeriaMap
              trucks={trucks}
              selectedId={selId}
              onSelect={(id) => setSelId(selId === id ? null : id)}
            />
          </div>
        </Card>

        {/* Side panel */}
        <div className="space-y-3">
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Fleet Status</p>
              {[
                { label: "Moving", value: moving, color: "text-emerald-400", dot: "bg-emerald-400" },
                { label: "Idle",   value: idle,   color: "text-slate-400",   dot: "bg-slate-500"  },
                { label: "Alert",  value: alerts, color: "text-red-400",     dot: "bg-red-400"    },
                { label: "Total",  value: trucks.length, color: "text-white", dot: "bg-amber-400" },
              ].map(({ label, value, color, dot }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", dot)} />
                    <span className="text-sm text-slate-400">{label}</span>
                  </div>
                  <span className={cn("text-sm font-bold font-mono tabular-nums", color)}>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {selTruck ? (
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{selTruck.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{selTruck.id}</p>
                  </div>
                  <StatusBadge status={selTruck.status} />
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    ["Driver",  selTruck.driver, "text-white"],
                    ["Route",   selTruck.route,  "text-blue-400 font-mono text-[10px]"],
                    ["Speed",   `${selTruck.speed} km/h`, selTruck.speed > 90 ? "text-red-400 font-mono" : "text-white font-mono"],
                    ["GPS",     `${selTruck.lat.toFixed(3)}°N  ${selTruck.lng.toFixed(3)}°E`, "text-slate-500 font-mono text-[10px]"],
                  ].map(([label, val, cls]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">{label}</span>
                      <span className={cn("text-right", cls)}>{val}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Fuel</span>
                    <span className={cn("font-mono font-bold", fuelText(selTruck.fuel))}>{selTruck.fuel}%</span>
                  </div>
                  <FuelBar pct={selTruck.fuel} />
                </div>

                <Button
                  size="sm"
                  onClick={() => onSelectTruck(selTruck.id)}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs"
                >
                  View Full Details →
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardContent className="p-6 text-center">
                <p className="text-xs text-slate-500">Click a truck on the map to see details</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
            <CardHeader className="py-2 px-4 border-b border-slate-700/30">
              <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">All Trucks</p>
            </CardHeader>
            <div className="max-h-52 overflow-y-auto">
              {trucks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelId(t.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-700/20 text-left transition-colors hover:bg-slate-700/30",
                    selId === t.id && "bg-amber-500/10"
                  )}
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{t.id}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

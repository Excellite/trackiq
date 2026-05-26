"use client";

import { cn } from "@/lib/cn";
import { fuelText } from "@/lib/constants";
import { Truck } from "@/data/trucks";
import { StatusBadge } from "@/components/ui/status-badge";
import { FuelBar } from "@/components/ui/fuel-bar";

export function TruckListItem({
  truck,
  onClick,
}: {
  truck: Truck;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="px-4 py-3 border-b border-slate-700/30 cursor-pointer hover:bg-slate-700/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="font-semibold text-sm text-white">{truck.name}</span>
          <span className="text-xs text-slate-500 font-mono ml-2 tabular-nums">{truck.id}</span>
        </div>
        <StatusBadge status={truck.status} />
      </div>
      <div className="text-xs text-slate-500 mb-2">
        👤 {truck.driver} · 📍 {truck.route}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-mono w-8 shrink-0 tabular-nums", fuelText(truck.fuel))}>
          {truck.fuel}%
        </span>
        <FuelBar pct={truck.fuel} />
        <span className="text-xs text-slate-500 font-mono shrink-0 w-16 text-right tabular-nums">
          {truck.speed} km/h
        </span>
      </div>
    </div>
  );
}

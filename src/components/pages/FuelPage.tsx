"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { cn } from "@/lib/cn";
import { fuelText, fuelTw } from "@/lib/constants";
import type { Truck } from "@/data/trucks";

export function FuelPage({
  trucks,
  onSelectTruck,
}: {
  trucks: Truck[];
  onSelectTruck: (id: string) => void;
}) {
  const critical = trucks.filter((t) => t.fuel < 20);
  const low      = trucks.filter((t) => t.fuel >= 20 && t.fuel < 50);
  const normal   = trucks.filter((t) => t.fuel >= 50);
  const avgFuel  = trucks.length
    ? (trucks.reduce((a, t) => a + t.fuel, 0) / trucks.length).toFixed(1)
    : "0";

  const sorted = [...trucks].sort((a, b) => a.fuel - b.fuel);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Fuel Monitoring</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time fuel levels · 400 L tanks · 38 L/100 km est.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard icon="⛽" label="Avg Fuel Level"  value={`${avgFuel}%`}       valueClass={fuelText(+avgFuel)}                             sub="Fleet average"   />
        <KPICard icon="🔴" label="Critical (<20%)" value={critical.length}     valueClass={critical.length > 0 ? "text-red-400" : "text-emerald-400"} sub="Immediate refuel" />
        <KPICard icon="🟡" label="Low (20–50%)"    value={low.length}          valueClass={low.length > 0 ? "text-amber-400" : "text-slate-400"}      sub="Refuel soon"      />
        <KPICard icon="🟢" label="Normal (>50%)"   value={normal.length}       valueClass="text-emerald-400"                               sub="All good"        />
      </div>

      {/* Critical alerts */}
      {critical.map((t) => (
        <Alert
          key={t.id}
          className="border-red-500/40 bg-red-500/10 text-red-400 cursor-pointer"
          onClick={() => onSelectTruck(t.id)}
        >
          <AlertDescription>
            ⛽ <strong>{t.name}</strong> ({t.id}) is at {t.fuel}% — est. range{" "}
            {Math.round((t.fuel * 4 * 100) / 38)} km. Click to view.
          </AlertDescription>
        </Alert>
      ))}

      {/* Bar chart */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="py-4 px-5 border-b border-slate-700/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">
                Fuel Level · All Trucks
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Sorted lowest first · click a bar for details</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-400">
              {[["bg-emerald-500", "Normal >50%"], ["bg-amber-500", "Low 20–50%"], ["bg-red-500", "Critical <20%"]].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-sm", c)} />{l}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex gap-4 items-end h-44">
            {sorted.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTruck(t.id)}
                className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <span className={cn(
                  "text-xs font-mono font-bold group-hover:scale-110 transition-transform tabular-nums",
                  fuelText(t.fuel)
                )}>
                  {t.fuel}%
                </span>
                <div className="w-full bg-slate-700 rounded-lg h-32 flex items-end overflow-hidden">
                  <div
                    className={cn("w-full rounded-lg transition-all duration-700", fuelTw(t.fuel))}
                    style={{ height: `${t.fuel}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{t.id.slice(4)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="py-3 px-5 border-b border-slate-700/30">
          <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Fuel Detail · All Trucks</p>
        </CardHeader>
        <div>
          {sorted.map((t) => {
            const liters  = Math.round(t.fuel * 4);
            const range   = Math.round((t.fuel * 4 * 100) / 38);
            const overdue = new Date(`${t.nextService}T00:00:00`) < new Date();
            return (
              <div
                key={t.id}
                onClick={() => onSelectTruck(t.id)}
                className="flex items-center gap-4 px-5 py-3 border-b border-slate-700/20 cursor-pointer hover:bg-slate-700/30 transition-colors"
              >
                <div className="w-28 shrink-0">
                  <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{t.id}</p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-mono font-bold tabular-nums shrink-0", fuelText(t.fuel))}>
                      {t.fuel}%
                    </span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", fuelTw(t.fuel))}
                        style={{ width: `${t.fuel}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-xs text-white font-mono tabular-nums">{liters} / 400 L</p>
                  <p className="text-[10px] text-slate-500">~{range} km range</p>
                </div>

                {overdue && (
                  <span className="shrink-0 text-[10px] text-red-400 font-mono border border-red-500/30 rounded px-1.5 py-0.5">
                    OVERDUE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

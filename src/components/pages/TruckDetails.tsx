"use client";

import { useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { StatusBadge } from "@/components/ui/status-badge";
import { KPICard } from "@/components/ui/kpi-card";
import { FuelGauge } from "@/components/trucks/FuelGauge";
import { FuelHistoryChart } from "@/components/charts/FuelHistoryChart";
import { SpeedChart } from "@/components/charts/SpeedChart";

import { Truck, genFuelHistory, genSpeedHistory } from "@/data/trucks";
import { cn } from "@/lib/cn";
import { fuelText } from "@/lib/constants";

function InfoRow({
  label,
  value,
  valueClass = "text-white font-mono",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between py-2.5 border-b border-slate-700/20 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

export function TruckDetails({
  truck,
  onBack,
}: {
  truck: Truck;
  onBack: () => void;
}) {
  const fuelHistory = useRef(genFuelHistory(36 + truck.fuel / 10)).current;
  const speedHistory = useRef(genSpeedHistory(truck.speed)).current;
  const overdue = new Date(`${truck.nextService}T00:00:00`) < new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          ← Back
        </Button>

        <div>
          <h1 className="text-xl font-bold text-white">{truck.name}</h1>
          <p className="text-xs text-slate-400 font-mono">
            {truck.plate} · {truck.model} · {truck.year}
          </p>
        </div>

        <div className="ml-auto">
          <StatusBadge status={truck.status} />
        </div>
      </div>

      {overdue && (
        <Alert className="border-red-500/40 bg-red-500/10 text-red-400">
          <AlertDescription>
            ⚠ Maintenance overdue. Last service: {truck.lastService}. Immediate
            inspection required.
          </AlertDescription>
        </Alert>
      )}

      {truck.fuel < 20 && (
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-400">
          <AlertDescription>
            ⛽ Critical fuel level ({truck.fuel}%). Immediate refuel required —
            est. range: {Math.round((truck.fuel * 4 * 100) / 38)} km.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        <KPICard
          icon="⛽"
          label="Fuel Level"
          value={`${truck.fuel}%`}
          valueClass={fuelText(truck.fuel)}
          sub="Tank: 400 L"
        />
        <KPICard
          icon="🚀"
          label="Current Speed"
          value={`${truck.speed} km/h`}
          valueClass={truck.speed > 90 ? "text-red-400" : "text-blue-400"}
          sub="Limit: 100 km/h"
        />
        <KPICard
          icon="📍"
          label="Odometer"
          value={`${truck.odometer.toLocaleString()} km`}
          valueClass="text-blue-400"
          sub="Total distance"
        />
        <KPICard
          icon="🔧"
          label="Next Service"
          value={truck.nextService}
          valueClass={overdue ? "text-red-400" : "text-amber-400"}
          sub={overdue ? "OVERDUE" : "Scheduled"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-0 pt-4 px-5">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">
              Fuel Consumption · 24H
            </p>
            <p className="text-xs text-slate-500 mt-0.5">L/100km vs target (38)</p>
          </CardHeader>
          <CardContent className="pt-3 px-5">
            <FuelHistoryChart data={fuelHistory} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-0 pt-4 px-5">
            <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">
              Speed Profile · Last 20 Readings
            </p>
            <p className="text-xs text-slate-500 mt-0.5">km/h · real-time samples</p>
          </CardHeader>
          <CardContent className="pt-3 px-5">
            <SpeedChart data={speedHistory} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">
              Truck Information
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <InfoRow label="Driver" value={truck.driver} />
            <InfoRow
              label="Truck ID"
              value={truck.id}
              valueClass="text-amber-400 font-mono tabular-nums"
            />
            <InfoRow label="Plate" value={truck.plate} />
            <InfoRow label="Model" value={truck.model} />
            <InfoRow
              label="Route"
              value={truck.route}
              valueClass="text-blue-400 font-mono text-xs"
            />
            <InfoRow label="Last Service" value={truck.lastService} />
            <InfoRow
              label="Next Service"
              value={truck.nextService}
              valueClass={cn(
                "font-mono tabular-nums",
                overdue ? "text-red-400" : "text-emerald-400"
              )}
            />
            <InfoRow
              label="Odometer"
              value={`${truck.odometer.toLocaleString()} km`}
            />
            <InfoRow
              label="GPS"
              value={`${truck.lat.toFixed(4)}°N, ${truck.lng.toFixed(4)}°E`}
              valueClass="text-slate-400 font-mono text-xs tabular-nums"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">
              Fuel Tank Status
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col items-center gap-4">
            <FuelGauge truck={truck} />

            <div className="w-full bg-slate-900/60 rounded-lg p-3 space-y-2 text-sm">
              {[
                ["Tank Capacity", "400 L"],
                ["Current Level", `${Math.round(truck.fuel * 4)} L (${truck.fuel}%)`],
                ["Est. Range", `${Math.round((truck.fuel * 4 * 100) / 38)} km`],
                ["Efficiency", "38 L/100km"],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="flex justify-between py-1 border-b border-slate-700/20"
                >
                  <span className="text-slate-400">{l}</span>
                  <span className="font-mono text-white tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

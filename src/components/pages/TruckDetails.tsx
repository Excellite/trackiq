"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { StatusBadge } from "@/components/ui/status-badge";
import { KPICard } from "@/components/ui/kpi-card";
import { FuelGauge } from "@/components/trucks/FuelGauge";
import { FuelHistoryChart } from "@/components/charts/FuelHistoryChart";
import { SpeedChart } from "@/components/charts/SpeedChart";
import { NigeriaMap } from "@/components/map/NigeriaMap";
import { useTripHistory } from "@/hooks/useTripHistory";
import { useTruckPositions } from "@/hooks/useTruckPositions";

import { Truck } from "@/data/trucks";
import { cn } from "@/lib/cn";
import { fuelText } from "@/lib/constants";
import type { Trip } from "@/lib/store";

function InfoRow({
  label,
  value,
  valueClass = "text-[var(--text)] font-mono",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between py-2.5 border-b border-[var(--border-sub)] text-sm">
      <span className="text-[var(--subtle)]">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function formatDuration(start: string, end: string | null | undefined) {
  if (!end) return "Active";
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function TripHistorySection({ truckId, currentTruck }: { truckId: string; currentTruck: Truck }) {
  const { trips, positions, activeTrip, loading, fetchPositions, clearPositions } = useTripHistory(truckId);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const handleSelectTrip = async (trip: Trip) => {
    if (selectedTrip?.id === trip.id) {
      setSelectedTrip(null);
      clearPositions();
      return;
    }
    setSelectedTrip(trip);
    if (trip.id) await fetchPositions(trip.id);
  };

  const totalKm = trips.reduce((a, t) => a + t.distance_km, 0);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <div className="pt-4 pb-2 px-5 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">Trip History</p>
          <p className="text-xs text-[var(--subtle)] mt-0.5">
            {trips.length} completed · {totalKm.toFixed(1)} km total
          </p>
        </div>
        {activeTrip && (
          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            TRIP ACTIVE
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-20">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && trips.length === 0 && (
        <p className="text-sm text-[var(--subtle)] p-5">
          No completed trips yet. Trips are recorded automatically once the GPS tracker is connected.
        </p>
      )}

      {trips.map((trip) => {
        const isSelected = selectedTrip?.id === trip.id;
        const fuelUsed = trip.fuel_start != null && trip.fuel_end != null
          ? +(trip.fuel_start - trip.fuel_end).toFixed(1) : null;

        return (
          <div key={trip.id}>
            <div
              onClick={() => handleSelectTrip(trip)}
              className={cn(
                "flex items-center gap-4 px-5 py-3 border-b border-[var(--border-sub)] cursor-pointer transition-colors",
                isSelected ? "bg-orange-50" : "hover:bg-[var(--surface-2)]"
              )}
            >
              <div className="shrink-0 text-center w-10">
                <p className="text-xs text-[var(--muted)]">
                  {new Date(trip.started_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </p>
                <p className="text-[10px] text-[var(--subtle)]">
                  {new Date(trip.started_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span className="text-emerald-500 font-mono">▶</span>
                  <span className="font-mono tabular-nums">{trip.start_lat?.toFixed(3)}°, {trip.start_lng?.toFixed(3)}°</span>
                  {trip.end_lat && (
                    <>
                      <span>→</span>
                      <span className="font-mono tabular-nums">{trip.end_lat.toFixed(3)}°, {trip.end_lng?.toFixed(3)}°</span>
                    </>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-[11px] text-[var(--subtle)]">
                  <span>{formatDuration(trip.started_at, trip.ended_at)}</span>
                  {fuelUsed !== null && <span>⛽ -{fuelUsed}%</span>}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-mono font-bold text-[var(--text)]">{trip.distance_km.toFixed(1)} km</p>
                <p className={cn("text-[10px] font-mono", isSelected ? "text-orange-500" : "text-[var(--subtle)]")}>
                  {isSelected ? "▲ hide route" : "▼ show route"}
                </p>
              </div>
            </div>

            {isSelected && (
              <div className="h-40 md:h-48 border-b border-[var(--border-sub)] bg-[var(--surface-2)]">
                <NigeriaMap
                  trucks={[currentTruck]}
                  selectedId={null}
                  onSelect={() => {}}
                  routePositions={positions.length > 0 ? positions : []}
                  routes={positions.length === 0 && trip.end_lat != null
                    ? [{ truckId: currentTruck.id, origin: { lat: trip.start_lat, lng: trip.start_lng }, destination: { lat: trip.end_lat!, lng: trip.end_lng! } }]
                    : []}
                  fitRoute={positions.length === 0 && trip.end_lat != null}
                />
              </div>
            )}
          </div>
        );
      })}
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
  const { fuelHistory, speedHistory, loading: posLoading, hasData, error: posError } = useTruckPositions(truck.id);
  const overdue = new Date(`${truck.nextService}T00:00:00`) < new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
        >
          ← Back
        </Button>

        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">{truck.name}</h1>
          <p className="text-xs text-[var(--subtle)] font-mono">
            {truck.plate} · {truck.model} · {truck.year}
          </p>
        </div>

        <div className="ml-auto">
          <StatusBadge status={truck.status} />
        </div>
      </div>

      {overdue && (
        <Alert className="border-red-200 bg-red-50 text-red-600">
          <AlertDescription>
            ⚠ Maintenance overdue. Last service: {truck.lastService}. Immediate inspection required.
          </AlertDescription>
        </Alert>
      )}

      {truck.fuel < 20 && (
        <Alert className="border-orange-200 bg-orange-50 text-orange-600">
          <AlertDescription>
            ⛽ Critical fuel level ({truck.fuel}%). Immediate refuel required —
            est. range: {Math.round((truck.fuel * 4 * 100) / 38)} km.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon="⛽" label="Fuel Level"    value={`${truck.fuel}%`}                    valueClass={fuelText(truck.fuel)}                           sub="Tank: 400 L"      />
        <KPICard icon="🚀" label="Current Speed" value={`${truck.speed} km/h`}               valueClass={truck.speed > 90 ? "text-red-500" : "text-blue-600"} sub="Limit: 100 km/h" />
        <KPICard icon="📍" label="Odometer"      value={`${truck.odometer.toLocaleString()} km`} valueClass="text-blue-600"                              sub="Total distance"   />
        <KPICard icon="🔧" label="Next Service"  value={truck.nextService}                   valueClass={overdue ? "text-red-500" : "text-orange-500"}   sub={overdue ? "OVERDUE" : "Scheduled"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm">
          <div className="pb-0 pt-4 px-5">
            <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">
              Fuel Level · Live History
            </p>
            <p className="text-xs text-[var(--subtle)] mt-0.5">% · from GPS tracker pings</p>
          </div>
          <div className="pt-3 px-5 pb-5">
            {posLoading ? (
              <div className="h-[180px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posError ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-red-400">⚠ Could not load position data.</p>
              </div>
            ) : !hasData ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-[var(--subtle)]">No position data yet — connect the GPS tracker.</p>
              </div>
            ) : (
              <FuelHistoryChart data={fuelHistory} />
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm">
          <div className="pb-0 pt-4 px-5">
            <p className="text-xs text-blue-500 font-mono tracking-widest uppercase font-semibold">
              Speed Profile · Live History
            </p>
            <p className="text-xs text-[var(--subtle)] mt-0.5">km/h · from GPS tracker pings</p>
          </div>
          <div className="pt-3 px-5 pb-5">
            {posLoading ? (
              <div className="h-[180px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posError ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-red-400">⚠ Could not load position data.</p>
              </div>
            ) : !hasData ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-[var(--subtle)]">No position data yet — connect the GPS tracker.</p>
              </div>
            ) : (
              <SpeedChart data={speedHistory} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm">
          <div className="pt-4 pb-2 px-5 border-b border-[var(--border-sub)]">
            <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">
              Truck Information
            </p>
          </div>
          <div className="px-5 pb-5">
            <InfoRow label="Driver"       value={truck.driver} />
            <InfoRow label="Truck ID"     value={truck.id}     valueClass="text-orange-500 font-mono tabular-nums" />
            <InfoRow label="Plate"        value={truck.plate} />
            <InfoRow label="Model"        value={truck.model} />
            <InfoRow label="Route"        value={truck.route}  valueClass="text-blue-500 font-mono text-xs" />
            <InfoRow label="Last Service" value={truck.lastService} />
            <InfoRow
              label="Next Service"
              value={truck.nextService}
              valueClass={cn("font-mono tabular-nums", overdue ? "text-red-500" : "text-emerald-600")}
            />
            <InfoRow label="Odometer" value={`${truck.odometer.toLocaleString()} km`} />
            <InfoRow
              label="GPS"
              value={`${truck.lat.toFixed(4)}°N, ${truck.lng.toFixed(4)}°E`}
              valueClass="text-[var(--subtle)] font-mono text-xs tabular-nums"
            />
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm">
          <div className="pt-4 pb-2 px-5 border-b border-[var(--border-sub)]">
            <p className="text-xs text-orange-500 font-mono tracking-widest uppercase font-semibold">
              Fuel Tank Status
            </p>
          </div>
          <div className="px-5 pb-5 flex flex-col items-center gap-4">
            <FuelGauge truck={truck} />
            <div className="w-full bg-[var(--surface-2)] rounded-lg p-3 space-y-2 text-sm">
              {[
                ["Tank Capacity", "400 L"],
                ["Current Level", `${Math.round(truck.fuel * 4)} L (${truck.fuel}%)`],
                ["Est. Range",    `${Math.round((truck.fuel * 4 * 100) / 38)} km`],
                ["Efficiency",    "38 L/100km"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1 border-b border-[var(--border-sub)]">
                  <span className="text-[var(--subtle)]">{l}</span>
                  <span className="font-mono text-[var(--text)] tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TripHistorySection truckId={truck.id} currentTruck={truck} />
    </div>
  );
}

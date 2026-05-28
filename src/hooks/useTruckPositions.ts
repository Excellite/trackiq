"use client";

import { useEffect, useState } from "react";

interface FuelPoint  { time: string; pct: number; min: number }
interface SpeedPoint { t: string; spd: number }

export function useTruckPositions(truckId: string) {
  const [fuelHistory,  setFuelHistory]  = useState<FuelPoint[]>([]);
  const [speedHistory, setSpeedHistory] = useState<SpeedPoint[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [hasData,      setHasData]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/trucks/${truckId}/positions`)
      .then((r) => r.json())
      .then((json) => {
        const positions = json.data ?? [];
        if (positions.length > 0) {
          setFuelHistory(
            positions.map((p: { fuel: number; recorded_at: string }) => ({
              time: new Date(p.recorded_at).toLocaleTimeString("en-NG", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              pct: p.fuel,
              min: 30,
            }))
          );
          setSpeedHistory(
            positions.map((p: { speed: number; recorded_at: string }) => ({
              t: new Date(p.recorded_at).toLocaleTimeString("en-NG", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              spd: p.speed,
            }))
          );
          setHasData(true);
        }
      })
      .catch((err: unknown) => setError((err as Error).message ?? "Failed to load position data"))
      .finally(() => setLoading(false));
  }, [truckId]);

  return { fuelHistory, speedHistory, loading, hasData, error };
}

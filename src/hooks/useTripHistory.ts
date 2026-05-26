"use client";

import { useCallback, useEffect, useState } from "react";
import type { Trip, Position } from "@/lib/store";

export function useTripHistory(truckId: string) {
  const [trips,     setTrips]     = useState<Trip[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading,   setLoading]   = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/trucks/${truckId}/trips`);
    const json = await res.json();
    if (json.data) {
      const all = json.data as Trip[];
      setTrips(all.filter((t) => t.status === "completed"));
      setActiveTrip(all.find((t) => t.status === "active") ?? null);
    }
    setLoading(false);
  }, [truckId]);

  const fetchPositions = useCallback(async (tripId: number) => {
    const res  = await fetch(`/api/trucks/${truckId}/trips?tripId=${tripId}`);
    const json = await res.json();
    if (json.data) setPositions(json.data as Position[]);
  }, [truckId]);

  const clearPositions = () => setPositions([]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  return { trips, positions, activeTrip, loading, fetchPositions, clearPositions, refresh: fetchTrips };
}

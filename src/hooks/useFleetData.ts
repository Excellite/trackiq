"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Truck } from "@/data/trucks";

const API_BASE = "/api/trucks";
const DEFAULT_POLL = 5_000;

interface FleetSummary {
  fleet: number;
  moving: number;
  alerts: number;
  avgFuel: number;
  avgSpeed: number;
}

interface ApiError {
  message: string;
  type: "network" | "api";
  retryable: boolean;
}

interface UseFleetDataOptions {
  pollInterval?: number;
  filters?: {
    status?: string;
    minFuel?: number;
    maxFuel?: number;
    limit?: number;
    offset?: number;
  };
  enabled?: boolean;
}

function buildUrl(filters: UseFleetDataOptions["filters"] = {}): string {
  const params = new URLSearchParams();
  if (filters.status)              params.set("status",   filters.status);
  if (filters.minFuel !== undefined) params.set("minFuel", String(filters.minFuel));
  if (filters.maxFuel !== undefined) params.set("maxFuel", String(filters.maxFuel));
  if (filters.limit   !== undefined) params.set("limit",   String(filters.limit));
  if (filters.offset  !== undefined) params.set("offset",  String(filters.offset));
  const qs = params.toString();
  return qs ? `${API_BASE}?${qs}` : API_BASE;
}

function deriveKPIs(trucks: Truck[]): FleetSummary | null {
  if (!trucks.length) return null;
  const moving = trucks.filter((t) => t.status === "moving");
  const alerts = trucks.filter((t) => t.status === "alert");
  return {
    fleet:    trucks.length,
    moving:   moving.length,
    alerts:   alerts.length,
    avgFuel:  +(trucks.reduce((a, t) => a + t.fuel, 0) / trucks.length).toFixed(1),
    avgSpeed: moving.length
      ? +(moving.reduce((a, t) => a + t.speed, 0) / moving.length).toFixed(1)
      : 0,
  };
}

export function useFleetData({
  pollInterval = DEFAULT_POLL,
  filters = {},
  enabled = true,
}: UseFleetDataOptions = {}) {
  const [trucks,      setTrucks]      = useState<Truck[]>([]);
  const [summary,     setSummary]     = useState<FleetSummary | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<ApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const fetchFleet = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildUrl(filtersRef.current), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        let message = `API error ${response.status}: ${response.statusText}`;
        try { message = (await response.json()).message ?? message; } catch { /* noop */ }
        throw new Error(message);
      }

      const json = await response.json();
      if (!json.success) throw new Error(json.message ?? "API returned an unsuccessful response.");
      if (!Array.isArray(json.data)) throw new Error("API response did not include a trucks array.");

      setTrucks(json.data as Truck[]);
      setSummary((json.meta?.summary as FleetSummary) ?? null);
      setLastUpdated(new Date(json.meta?.timestamp ?? Date.now()));
    } catch (err) {
      const e = err as Error;
      const isNetwork = e instanceof TypeError && e.message.includes("fetch");
      setError({ message: e.message ?? "Unknown error", type: isNetwork ? "network" : "api", retryable: true });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !pollInterval) return;
    const interval = setInterval(() => fetchFleet({ silent: true }), pollInterval);
    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchFleet]);

  return {
    trucks,
    summary: summary ?? deriveKPIs(trucks),
    loading,
    error,
    lastUpdated,
    refresh: () => fetchFleet(),
  };
}

export function useFleetTruck(id: string | null) {
  const [truck,   setTruck]   = useState<(Truck & { _derived?: Record<string, unknown> }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<ApiError | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/${id}`, { cache: "no-store" });
        if (!response.ok) {
          let message = `API error ${response.status}`;
          try { message = (await response.json()).message ?? message; } catch { /* noop */ }
          throw new Error(message);
        }
        const json = await response.json();
        if (!json.success) throw new Error(json.message ?? "API error");
        if (!cancelled) setTruck(json.data);
      } catch (err) {
        const e = err as Error;
        if (!cancelled) setError({ message: e.message, type: "api", retryable: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  return { truck, loading, error };
}

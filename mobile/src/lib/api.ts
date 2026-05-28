import { API_BASE } from "./config";
import type { Truck, Trip, Alert, Driver } from "./types";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

// ── Trucks ────────────────────────────────────────────────────────────────────

export async function fetchTrucks(): Promise<Truck[]> {
  const json = await get<{ data: Truck[] }>("/api/trucks");
  return json.data ?? [];
}

export async function fetchTruck(id: string): Promise<Truck | null> {
  try {
    const json = await get<{ data: Truck }>(`/api/trucks/${id}`);
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ── Trips ─────────────────────────────────────────────────────────────────────

export async function fetchTrips(limit = 100): Promise<Trip[]> {
  const json = await get<{ data: Trip[] }>("/api/trips");
  return (json.data ?? []).slice(0, limit);
}

export async function fetchTruckTrips(truckId: string): Promise<Trip[]> {
  const json = await get<{ data: Trip[] }>(`/api/trucks/${truckId}/trips`);
  return json.data ?? [];
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function fetchAlerts(): Promise<Alert[]> {
  const json = await get<{ data: Alert[] }>("/api/notifications");
  return json.data ?? [];
}

// ── Drivers ───────────────────────────────────────────────────────────────────

export async function fetchDrivers(): Promise<Driver[]> {
  const json = await get<{ data: Driver[] }>("/api/drivers");
  return json.data ?? [];
}

// ── Truck positions (GPS trail) ───────────────────────────────────────────────

export interface Position {
  lat: number; lng: number; speed: number; fuel: number; recorded_at: string;
}

export async function fetchTruckPositions(truckId: string): Promise<Position[]> {
  const json = await get<{ data: Position[] }>(`/api/trucks/${truckId}/positions`);
  return json.data ?? [];
}

// ── GPS tracker ping (driver mode) ────────────────────────────────────────────

export async function pingTracker(payload: {
  imei: string;
  lat: number;
  lng: number;
  speed: number;
  fuel?: number;
}): Promise<void> {
  await fetch(`${API_BASE}/api/tracker`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

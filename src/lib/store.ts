import { supabase } from "@/lib/supabase";
import type { Truck } from "@/data/trucks";

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  model: string;
  year: string;
  route: string;
  fuel_capacity: number;
  status: string;
  created_at?: string;
}

export interface Driver {
  id?: string;
  name: string;
  phone: string;
  license_no: string;
  assigned_truck_id: string;
  created_at?: string;
}

export interface Position {
  id?: number;
  truck_id: string;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  recorded_at?: string;
}

export interface Trip {
  id?: number;
  truck_id: string;
  started_at: string;
  ended_at?: string | null;
  start_lat: number;
  start_lng: number;
  end_lat?: number | null;
  end_lng?: number | null;
  distance_km: number;
  fuel_start: number;
  fuel_end?: number | null;
  status: "active" | "completed";
}

const TABLE = "trucks";

export async function getAllTrucks(filters: {
  status?: string;
  minFuel?: number;
  maxFuel?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<{ data: Truck[]; total: number }> {
  let query = supabase.from(TABLE).select("*", { count: "exact" });

  if (filters.status)              query = query.eq("status", filters.status);
  if (filters.minFuel !== undefined) query = query.gte("fuel", filters.minFuel);
  if (filters.maxFuel !== undefined) query = query.lte("fuel", filters.maxFuel);

  const limit  = filters.limit  ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as Truck[], total: count ?? 0 };
}

export async function getTruckById(id: string): Promise<Truck | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Truck | null;
}

export async function addTruck(truck: Truck): Promise<Truck> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(truck)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Truck;
}

export async function updateTruckById(id: string, patch: Partial<Truck>): Promise<Truck> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Truck;
}

export async function deleteTruckById(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTruckByImei(
  imei: string,
  patch: { lat: number; lng: number; speed: number; fuel: number; status?: string }
): Promise<Truck | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, status: patch.status ?? "moving" })
    .eq("imei", imei)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Truck | null;
}

// ── Trip history ─────────────────────────────────────────────────────────────

export async function logPosition(
  truckId: string, lat: number, lng: number, speed: number, fuel: number
): Promise<void> {
  const { error } = await supabase
    .from("truck_positions")
    .insert({ truck_id: truckId, lat, lng, speed, fuel });
  if (error) throw new Error(error.message);
}

export async function getLastPosition(truckId: string): Promise<Position | null> {
  const { data, error } = await supabase
    .from("truck_positions")
    .select("*")
    .eq("truck_id", truckId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Position | null;
}

export async function getActiveTrip(truckId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("truck_id", truckId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Trip | null;
}

export async function startTrip(
  truckId: string, lat: number, lng: number, fuel: number
): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .insert({ truck_id: truckId, start_lat: lat, start_lng: lng, fuel_start: fuel, status: "active" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Trip;
}

export async function updateTripDistance(tripId: number, addKm: number): Promise<void> {
  await supabase.rpc("increment_trip_distance", { trip_id: tripId, add_km: addKm });
}

export async function completeTrip(
  tripId: number, lat: number, lng: number, fuel: number
): Promise<void> {
  const { error } = await supabase
    .from("trips")
    .update({ status: "completed", ended_at: new Date().toISOString(), end_lat: lat, end_lng: lng, fuel_end: fuel })
    .eq("id", tripId);
  if (error) throw new Error(error.message);
}

export async function getTripsByTruck(truckId: string, limit = 20): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("truck_id", truckId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Trip[];
}

export async function getTripPositions(tripId: number): Promise<Position[]> {
  const trip = await supabase
    .from("trips")
    .select("truck_id, started_at, ended_at")
    .eq("id", tripId)
    .single();
  if (trip.error) throw new Error(trip.error.message);
  const { truck_id, started_at, ended_at } = trip.data;

  let q = supabase
    .from("truck_positions")
    .select("lat, lng, speed, fuel, recorded_at")
    .eq("truck_id", truck_id)
    .gte("recorded_at", started_at)
    .order("recorded_at", { ascending: true });
  if (ended_at) q = q.lte("recorded_at", ended_at);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Position[];
}

export async function getRecentPositions(truckId: string, limit = 50): Promise<Position[]> {
  const { data, error } = await supabase
    .from("truck_positions")
    .select("lat, lng, speed, fuel, recorded_at")
    .eq("truck_id", truckId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Position[]).reverse();
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Vehicle[];
}

export async function addVehicle(v: Omit<Vehicle, "created_at">): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .insert(v)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Vehicle;
}

export async function getAllDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Driver[];
}

export async function addDriver(d: Omit<Driver, "id" | "created_at">): Promise<Driver> {
  const { data, error } = await supabase
    .from("drivers")
    .insert(d)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Driver;
}

export async function getFleetSummary() {
  const { data, error } = await supabase.from(TABLE).select("status, fuel, speed");
  if (error) throw new Error(error.message);
  const all = (data ?? []) as Pick<Truck, "status" | "fuel" | "speed">[];

  const moving = all.filter((t) => t.status === "moving");
  return {
    fleet:    all.length,
    moving:   moving.length,
    alerts:   all.filter((t) => t.status === "alert").length,
    avgFuel:  all.length ? +(all.reduce((a, t) => a + t.fuel, 0) / all.length).toFixed(1) : 0,
    avgSpeed: moving.length ? +(moving.reduce((a, t) => a + t.speed, 0) / moving.length).toFixed(1) : 0,
  };
}

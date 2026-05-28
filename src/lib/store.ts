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

function parseTruck(t: Record<string, unknown>): Truck {
  return {
    ...(t as unknown as Truck),
    fuel:     Number(t.fuel),
    speed:    Number(t.speed),
    odometer: Number(t.odometer),
    lat:      Number(t.lat),
    lng:      Number(t.lng),
    year:     Number(t.year),
  };
}

function parseMaintenance(r: Record<string, unknown>): MaintenanceRecord {
  return {
    ...(r as unknown as MaintenanceRecord),
    cost_ngn:    r.cost_ngn    != null ? Number(r.cost_ngn)    : null,
    odometer_km: r.odometer_km != null ? Number(r.odometer_km) : null,
  };
}

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
  return { data: (data ?? []).map((t) => parseTruck(t as Record<string, unknown>)), total: count ?? 0 };
}

export async function getTruckById(id: string): Promise<Truck | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? parseTruck(data as Record<string, unknown>) : null;
}

export async function addTruck(truck: Truck): Promise<Truck> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(truck)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return parseTruck(data as Record<string, unknown>);
}

export async function updateTruckById(id: string, patch: Partial<Truck>): Promise<Truck> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return parseTruck(data as Record<string, unknown>);
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
  return data ? parseTruck(data as Record<string, unknown>) : null;
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
  return data ? parsePosition(data as Record<string, unknown>) : null;
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
  return data ? parseTrip(data as Record<string, unknown>) : null;
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
  return parseTrip(data as Record<string, unknown>);
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

function parseTrip(t: Record<string, unknown>): Trip {
  return {
    ...(t as unknown as Trip),
    distance_km: Number(t.distance_km),
    start_lat:   Number(t.start_lat),
    start_lng:   Number(t.start_lng),
    end_lat:     t.end_lat  != null ? Number(t.end_lat)  : null,
    end_lng:     t.end_lng  != null ? Number(t.end_lng)  : null,
    fuel_start:  Number(t.fuel_start),
    fuel_end:    t.fuel_end != null ? Number(t.fuel_end) : null,
  };
}

function parsePosition(p: Record<string, unknown>): Position {
  return {
    ...(p as unknown as Position),
    lat:   Number(p.lat),
    lng:   Number(p.lng),
    speed: Number(p.speed),
    fuel:  Number(p.fuel),
  };
}

export async function getAllTrips(limit = 100): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => parseTrip(t as Record<string, unknown>));
}

export async function getTripsByTruck(truckId: string, limit = 20): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("truck_id", truckId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => parseTrip(t as Record<string, unknown>));
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
  return (data ?? []).map((p) => parsePosition(p as Record<string, unknown>));
}

export async function getRecentPositions(truckId: string, limit = 50): Promise<Position[]> {
  const { data, error } = await supabase
    .from("truck_positions")
    .select("lat, lng, speed, fuel, recorded_at")
    .eq("truck_id", truckId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => parsePosition(p as Record<string, unknown>)).reverse();
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

export interface DriverWithStats extends Driver {
  status: string;
  join_date: string | null;
  truck_name: string | null;
  truck_model: string | null;
  truck_plate: string | null;
  vehicle_type: string | null;
  truck_status: string | null;
  trip_count: number;
  total_km: number;
  last_trip_at: string | null;
}

export async function getDriversWithStats(): Promise<DriverWithStats[]> {
  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("*, truck:assigned_truck_id(name, model, plate, vehicle_type, status)")
    .order("name");
  if (error) throw new Error(error.message);

  const truckIds = (drivers ?? [])
    .map((d: Record<string, unknown>) => d.assigned_truck_id as string)
    .filter(Boolean);

  let tripStats: { truck_id: string; distance_km: number; started_at: string }[] = [];
  if (truckIds.length > 0) {
    const { data } = await supabase
      .from("trips")
      .select("truck_id, distance_km, started_at")
      .in("truck_id", truckIds)
      .eq("status", "completed");
    tripStats = (data ?? []).map((t: Record<string, unknown>) => ({
      truck_id:    t.truck_id as string,
      distance_km: Number(t.distance_km),
      started_at:  t.started_at as string,
    }));
  }

  return (drivers ?? []).map((d: Record<string, unknown>) => {
    const truck = d.truck as Record<string, unknown> | null;
    const driverTrips = tripStats.filter((t) => t.truck_id === d.assigned_truck_id);
    const sorted = [...driverTrips].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    return {
      id:               d.id as string,
      name:             d.name as string,
      phone:            d.phone as string,
      license_no:       d.license_no as string,
      assigned_truck_id: d.assigned_truck_id as string,
      status:           (d.status as string) ?? "active",
      join_date:        (d.join_date as string) ?? null,
      created_at:       d.created_at as string,
      truck_name:       (truck?.name as string) ?? null,
      truck_model:      (truck?.model as string) ?? null,
      truck_plate:      (truck?.plate as string) ?? null,
      vehicle_type:     (truck?.vehicle_type as string) ?? null,
      truck_status:     (truck?.status as string) ?? null,
      trip_count:       driverTrips.length,
      total_km:         +driverTrips.reduce((a, t) => a + t.distance_km, 0).toFixed(1),
      last_trip_at:     sorted[0]?.started_at ?? null,
    };
  });
}

export async function reassignDriver(driverId: string, newTruckId: string | null): Promise<void> {
  // Find old assignment before updating so we can clear the old truck
  const { data: existing } = await supabase
    .from("drivers")
    .select("name, assigned_truck_id")
    .eq("id", driverId)
    .single();

  const { error: dErr } = await supabase
    .from("drivers")
    .update({ assigned_truck_id: newTruckId })
    .eq("id", driverId);
  if (dErr) throw new Error(dErr.message);

  // Clear driver name from old truck (if it changed)
  if (existing?.assigned_truck_id && existing.assigned_truck_id !== newTruckId) {
    await supabase.from("trucks").update({ driver: "" }).eq("id", existing.assigned_truck_id);
  }

  // Set driver name on new truck
  if (newTruckId && existing?.name) {
    await supabase.from("trucks").update({ driver: existing.name }).eq("id", newTruckId);
  }
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
  const all = (data ?? []).map((t) => ({
    status: t.status as string,
    fuel:   Number(t.fuel),
    speed:  Number(t.speed),
  }));

  const moving = all.filter((t) => t.status === "moving");
  return {
    fleet:    all.length,
    moving:   moving.length,
    alerts:   all.filter((t) => t.status === "alert").length,
    avgFuel:  all.length ? +(all.reduce((a, t) => a + t.fuel, 0) / all.length).toFixed(1) : 0,
    avgSpeed: moving.length ? +(moving.reduce((a, t) => a + t.speed, 0) / moving.length).toFixed(1) : 0,
  };
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export interface MaintenanceRecord {
  id?: string;
  truck_id: string;
  service_type: string;
  performed_at: string;
  next_due_at?: string | null;
  odometer_km?: number | null;
  cost_ngn?: number | null;
  technician?: string | null;
  notes?: string | null;
  created_at?: string;
}

export async function getMaintenanceByTruck(truckId: string): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("truck_id", truckId)
    .order("performed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => parseMaintenance(r as Record<string, unknown>));
}

export async function getAllMaintenance(): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("*")
    .order("performed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => parseMaintenance(r as Record<string, unknown>));
}

export async function addMaintenanceRecord(
  record: Omit<MaintenanceRecord, "id" | "created_at">
): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from("maintenance_records")
    .insert(record)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return parseMaintenance(data as Record<string, unknown>);
}

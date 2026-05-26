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

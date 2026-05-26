import { supabase } from "@/lib/supabase";
import type { Truck } from "@/data/trucks";

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

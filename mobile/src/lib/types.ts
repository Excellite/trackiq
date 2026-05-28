// Mirror of web app types — keep in sync with src/data/trucks.ts and src/lib/store.ts

export interface Truck {
  id: string;
  name: string;
  driver: string;
  plate: string;
  model: string;
  year: number;
  status: "moving" | "idle" | "offline" | "alert";
  fuel: number;
  speed: number;
  odometer: number;
  lat: number;
  lng: number;
  route: string;
  lastService: string;
  nextService: string;
  vehicle_type: "truck" | "bus" | "car" | "trailer";
  imei?: string;
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

export interface Alert {
  id: string;
  type: "low_fuel" | "maintenance_overdue" | "offline" | "doc_expiry" | "speeding";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  truck_id: string;
  created_at: string;
}

export interface Driver {
  id?: string;
  name: string;
  phone: string;
  license_no: string;
  assigned_truck_id: string;
  truck_name?: string | null;
  truck_plate?: string | null;
  vehicle_type?: string | null;
  trip_count: number;
  total_km: number;
}

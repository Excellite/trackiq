import { z } from "zod";

export const FUEL_TYPES = ["petrol", "diesel", "electric", "hybrid", "lpg", "cng"] as const;
export type FuelType = typeof FUEL_TYPES[number];

export const VEHICLE_TYPES = ["truck", "bus", "car", "trailer"] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

const currentYear = new Date().getFullYear();

export const addVehicleSchema = z.object({
  vehicleType:  z.enum(VEHICLE_TYPES, { error: "Vehicle type is required" }),
  vehicleName:  z.string().min(1, "Vehicle name is required"),
  fleetId:      z.string().min(1, "Fleet ID is required"),
  plate:        z.string().min(1, "Plate number is required"),
  make:         z.string().min(1, "Make is required"),
  model:        z.string().min(1, "Model is required"),
  year:         z.number().int().min(1990, "Year must be 1990 or later").max(currentYear + 1),
  fuelType:     z.enum(FUEL_TYPES, { error: "Fuel type is required" }),
  route:        z.string(),
  vin:          z.string(),
  locationLat:  z.string(),
  locationLng:  z.string(),
});

export type AddVehicleFormData = z.infer<typeof addVehicleSchema>;

// Legacy aliases kept so existing imports don't break
export const vehicleRegistrationSchema = addVehicleSchema;
export type VehicleRegistrationFormData = AddVehicleFormData;

export interface RegisteredVehicle {
  fleetId:     string;
  vehicleName: string;
  plate:       string;
  make:        string;
  model:       string;
  year:        number;
  vehicleType: string;
  fuelType:    string;
  route:       string;
  driverName?: string;
  docsCount:   number;
}

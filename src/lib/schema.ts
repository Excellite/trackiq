import { z } from "zod";

export const FUEL_TYPES = ["petrol", "diesel", "electric", "hybrid", "lpg", "cng"] as const;
export type FuelType = typeof FUEL_TYPES[number];

const currentYear = new Date().getFullYear();

export const vehicleRegistrationSchema = z.object({
  make:            z.string().min(1, "Make is required"),
  model:           z.string().min(1, "Model is required"),
  year:            z.number().int().min(1900, "Year must be 1900 or later").max(currentYear + 1, `Year must be ${currentYear + 1} or earlier`),
  vin:             z.string().length(17, "VIN must be exactly 17 characters").regex(/^[A-HJ-NPR-Z0-9]{17}$/, "VIN contains invalid characters"),
  licensePlate:    z.string().min(1, "License plate is required"),
  fuelType:        z.enum(FUEL_TYPES, { error: "Fuel type is required" }),
  locationAddress: z.string().min(1, "Address is required"),
  locationLat:     z.string(),
  locationLng:     z.string(),
  ownerName:       z.string().min(1, "Owner name is required"),
  ownerEmail:      z.string().email("Invalid email address"),
  ownerPhone:      z.string().min(7, "Phone number is required"),
});

export type VehicleRegistrationFormData = z.infer<typeof vehicleRegistrationSchema>;

export interface Vehicle extends VehicleRegistrationFormData {
  id: number;
  status: string;
  created_at: string;
}

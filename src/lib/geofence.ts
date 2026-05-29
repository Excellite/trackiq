// Home depots for each truck — used for geofence breach detection
export const HOME_DEPOTS: Record<string, { lat: number; lng: number; name: string; radiusKm: number }> = {
  "TRK-001": { lat: 6.430, lng: 3.420, name: "Apapa Depot",   radiusKm: 300 },
  "TRK-002": { lat: 6.595, lng: 3.344, name: "Ojota Hub",     radiusKm: 400 },
  "TRK-003": { lat: 7.430, lng: 3.900, name: "Ibadan Yard",   radiusKm: 600 },
  "TRK-004": { lat: 6.520, lng: 3.358, name: "Mushin Depot",  radiusKm: 350 },
  "TRK-005": { lat: 6.430, lng: 3.420, name: "Apapa Depot",   radiusKm: 80  },
  "TRK-006": { lat: 6.430, lng: 3.420, name: "Apapa Port",    radiusKm: 100 },
  "BUS-001": { lat: 6.600, lng: 3.348, name: "Ikeja Terminal", radiusKm: 80  },
  "BUS-002": { lat: 6.595, lng: 3.344, name: "Ojota Hub",     radiusKm: 250 },
  "BUS-003": { lat: 6.430, lng: 3.420, name: "Apapa Depot",   radiusKm: 60  },
  "CAR-001": { lat: 6.600, lng: 3.348, name: "Ikeja Office",  radiusKm: 80  },
  "CAR-002": { lat: 6.600, lng: 3.348, name: "Ikeja Office",  radiusKm: 50  },
  "CAR-003": { lat: 6.433, lng: 3.498, name: "Lekki Office",  radiusKm: 60  },
  "TRL-001": { lat: 12.01, lng: 8.520, name: "Kano Yard",     radiusKm: 500 },
  "TRL-002": { lat: 6.430, lng: 3.420, name: "Apapa Depot",   radiusKm: 200 },
  "TRL-003": { lat: 12.00, lng: 8.520, name: "Kano Yard",     radiusKm: 10  },
};

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function checkGeofence(
  truckId: string,
  lat: number,
  lng: number
): { breached: boolean; depotName: string; distanceKm: number; radiusKm: number } | null {
  const depot = HOME_DEPOTS[truckId];
  if (!depot) return null;
  const distanceKm = haversineKm({ lat, lng }, depot);
  return { breached: distanceKm > depot.radiusKm, depotName: depot.name, distanceKm, radiusKm: depot.radiusKm };
}

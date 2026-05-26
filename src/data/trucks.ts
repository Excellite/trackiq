export interface Truck {
  id: string;
  name: string;
  driver: string;
  plate: string;
  model: string;
  year: number;
  status: string;
  fuel: number;
  speed: number;
  odometer: number;
  lat: number;
  lng: number;
  route: string;
  lastService: string;
  nextService: string;
}

export const TRUCKS: Truck[] = [
  {
    id: "TRK-001",
    name: "Lagos Hauler 1",
    driver: "Adeyemi Tunde",
    plate: "LND-874-KJA",
    model: "MAN TGS 26.440",
    year: 2019,
    status: "moving",
    fuel: 78,
    speed: 64,
    odometer: 142300,
    lat: 6.465,
    lng: 3.406,
    route: "Apapa → Sagamu",
    lastService: "2025-03-12",
    nextService: "2025-09-12",
  },
  {
    id: "TRK-002",
    name: "Abuja Runner",
    driver: "Chukwuemeka Eze",
    plate: "LND-211-ABJ",
    model: "Sinotruk HOWO",
    year: 2021,
    status: "moving",
    fuel: 45,
    speed: 82,
    odometer: 98450,
    lat: 6.601,
    lng: 3.351,
    route: "Ojota → Ibadan",
    lastService: "2025-04-01",
    nextService: "2025-10-01",
  },
  {
    id: "TRK-003",
    name: "North Express",
    driver: "Kabiru Bello",
    plate: "LND-519-ENU",
    model: "DAF XF 480",
    year: 2020,
    status: "moving",
    fuel: 62,
    speed: 95,
    odometer: 231100,
    lat: 7.38,
    lng: 3.9,
    route: "Tin Can → Kano",
    lastService: "2025-02-20",
    nextService: "2025-08-20",
  },
  {
    id: "TRK-004",
    name: "Benin Cargo",
    driver: "Tope Adeyemi",
    plate: "LND-302-KJA",
    model: "Volvo FH16",
    year: 2018,
    status: "alert",
    fuel: 12,
    speed: 0,
    odometer: 305800,
    lat: 6.34,
    lng: 5.63,
    route: "Mushin → Benin City",
    lastService: "2024-11-05",
    nextService: "2025-05-05",
  },
  {
    id: "TRK-005",
    name: "Lagos Local",
    driver: "Seun Olatunji",
    plate: "LND-109-EKO",
    model: "Iveco Stralis",
    year: 2022,
    status: "idle",
    fuel: 91,
    speed: 0,
    odometer: 41200,
    lat: 6.452,
    lng: 3.396,
    route: "Warehouse — Idle",
    lastService: "2025-05-01",
    nextService: "2025-11-01",
  },
  {
    id: "TRK-006",
    name: "Port Runner",
    driver: "Emeka Nwosu",
    plate: "LND-633-APT",
    model: "Mercedes Actros",
    year: 2023,
    status: "moving",
    fuel: 55,
    speed: 57,
    odometer: 22900,
    lat: 6.43,
    lng: 3.51,
    route: "Apapa Port → Ikeja",
    lastService: "2025-05-10",
    nextService: "2025-11-10",
  },
];

export const genFuelHistory = (base: number, n = 24) =>
  Array.from({ length: n }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    l100: +(base + (Math.random() - 0.5) * 12).toFixed(1),
    target: 38,
  }));

export const genSpeedHistory = (base: number, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    spd: +Math.max(0, base + (Math.random() - 0.5) * 30).toFixed(0),
  }));

"use client";

import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ── utils ────────────────────────────────────────────────────────────────────
const cn = (...classes: (string | undefined | false | null)[]) =>
  classes.filter(Boolean).join(" ");

const STATUS: Record<string, { label: string; tw: string }> = {
  moving: {
    label: "Moving",
    tw: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  idle: {
    label: "Idle",
    tw: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  },
  alert: {
    label: "Alert",
    tw: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  offline: {
    label: "Offline",
    tw: "bg-zinc-700/40 text-zinc-500 border-zinc-600/30",
  },
};

const fuelTw = (f: number) =>
  f > 50 ? "bg-emerald-500" : f > 20 ? "bg-amber-500" : "bg-red-500";

const fuelText = (f: number) =>
  f > 50 ? "text-emerald-400" : f > 20 ? "text-amber-400" : "text-red-400";

// ── types ─────────────────────────────────────────────────────────────────────
interface Truck {
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

interface User {
  name: string;
  email: string;
  role: string;
}

// ── mock data ────────────────────────────────────────────────────────────────
const TRUCKS: Truck[] = [
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

const genFuelHistory = (base: number, n = 24) =>
  Array.from({ length: n }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    l100: +(base + (Math.random() - 0.5) * 12).toFixed(1),
    target: 38,
  }));

const genSpeedHistory = (base: number, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    spd: +Math.max(0, base + (Math.random() - 0.5) * 30).toFixed(0),
  }));

// ── small UI ─────────────────────────────────────────────────────────────────
const LiveDot = ({
  pulse = false,
  color = "bg-emerald-500",
}: {
  pulse?: boolean;
  color?: string;
}) => (
  <span className="relative flex h-2.5 w-2.5">
    {pulse && (
      <span
        className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-40",
          color
        )}
      />
    )}
    <span
      className={cn("relative inline-flex rounded-full h-2.5 w-2.5", color)}
    />
  </span>
);

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS[status] || STATUS.offline;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border",
        s.tw
      )}
    >
      <LiveDot
        pulse={status === "moving"}
        color={
          status === "moving"
            ? "bg-emerald-400"
            : status === "alert"
            ? "bg-red-400"
            : "bg-slate-400"
        }
      />
      {s.label}
    </span>
  );
};

const FuelBar = ({ pct }: { pct: number }) => (
  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
    <div
      className={cn("h-full rounded-full transition-all duration-700", fuelTw(pct))}
      style={{ width: `${pct}%` }}
    />
  </div>
);

const KPICard = ({
  icon,
  label,
  value,
  sub,
  valueClass = "text-white",
  onClick,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
  onClick?: () => void;
}) => (
  <Card
    onClick={onClick}
    className={cn(
      "bg-slate-800/60 border-slate-700/50 flex-1 min-w-[140px]",
      onClick && "cursor-pointer hover:bg-slate-700/60 transition-colors"
    )}
  >
    <CardContent className="p-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div
        className={cn(
          "text-3xl font-bold tracking-tight tabular-nums",
          valueClass
        )}
      >
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </CardContent>
  </Card>
);

// ── map ──────────────────────────────────────────────────────────────────────
const toXY = (lat: number, lng: number) => ({
  x: ((lng - 3) / 12) * 100,
  y: 100 - ((lat - 4) / 10) * 100,
});

const CITIES = [
  { name: "Lagos", lat: 6.46, lng: 3.4 },
  { name: "Ibadan", lat: 7.38, lng: 3.9 },
  { name: "Abuja", lat: 9.07, lng: 7.4 },
  { name: "Kano", lat: 12.0, lng: 8.52 },
  { name: "Port Harcourt", lat: 4.82, lng: 7.05 },
  { name: "Benin City", lat: 6.34, lng: 5.63 },
  { name: "Kaduna", lat: 10.52, lng: 7.44 },
];

const ROADS = [
  [
    [6.46, 3.4],
    [7.38, 3.9],
    [9.07, 7.4],
    [12.0, 8.52],
  ],
  [
    [6.46, 3.4],
    [6.34, 5.63],
    [4.82, 7.05],
  ],
  [
    [9.07, 7.4],
    [10.52, 7.44],
    [12.0, 8.52],
  ],
  [
    [6.46, 3.4],
    [9.07, 7.4],
  ],
];

const NigeriaMap = ({
  trucks,
  selectedId,
  onSelect,
}: {
  trucks: Truck[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => {
  const markerColor = (s: string) =>
    s === "moving"
      ? "#22C55E"
      : s === "alert"
      ? "#EF4444"
      : s === "idle"
      ? "#64748B"
      : "#374151";

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full block">
      <rect width="100" height="100" fill="#0A0E18" rx="8" />
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={v} y1={0} x2={v} y2={100} stroke="#1E2840" strokeWidth="0.3" />
          <line x1={0} y1={v} x2={100} y2={v} stroke="#1E2840" strokeWidth="0.3" />
        </g>
      ))}

      {ROADS.map((r, i) => {
        const pts = r
          .map(([la, ln]) => {
            const p = toXY(la, ln);
            return `${p.x},${p.y}`;
          })
          .join(" ");
        return (
          <polyline
            key={i}
            points={pts}
            fill="none"
            stroke="#3D4A5C"
            strokeWidth="0.5"
            strokeDasharray="1.5 1"
            opacity="0.6"
          />
        );
      })}

      {CITIES.map((c) => {
        const p = toXY(c.lat, c.lng);
        return (
          <g key={c.name}>
            <circle cx={p.x} cy={p.y} r="0.8" fill="#3D4A5C" opacity="0.7" />
            <text
              x={p.x + 1.2}
              y={p.y + 0.8}
              fill="#4A5568"
              fontSize="2.4"
              fontFamily="monospace"
              opacity="0.8"
            >
              {c.name}
            </text>
          </g>
        );
      })}

      {trucks.map((t) => {
        const p = toXY(t.lat, t.lng);
        const mc = markerColor(t.status);
        const sel = selectedId === t.id;

        return (
          <g key={t.id} onClick={() => onSelect(t.id)} style={{ cursor: "pointer" }}>
            {sel && (
              <circle cx={p.x} cy={p.y} r="5" fill="none" stroke={mc} strokeWidth="0.6" opacity="0.4" />
            )}
            {t.status === "moving" && (
              <circle cx={p.x} cy={p.y} r="3" fill={mc} opacity="0.15">
                <animate attributeName="r" from="2" to="5" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r={sel ? 2.6 : 1.8} fill={mc} />
            <text
              x={p.x + 2.2}
              y={p.y + 0.8}
              fill={mc}
              fontSize="2.4"
              fontFamily="monospace"
              fontWeight={sel ? "bold" : "normal"}
            >
              {t.id.slice(4)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ── truck pieces ─────────────────────────────────────────────────────────────
const TruckListItem = ({
  truck,
  onClick,
}: {
  truck: Truck;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="px-4 py-3 border-b border-slate-700/30 cursor-pointer hover:bg-slate-700/30 transition-colors"
  >
    <div className="flex items-center justify-between mb-1.5">
      <div>
        <span className="font-semibold text-sm text-white">{truck.name}</span>
        <span className="text-xs text-slate-500 font-mono ml-2 tabular-nums">{truck.id}</span>
      </div>
      <StatusBadge status={truck.status} />
    </div>
    <div className="text-xs text-slate-500 mb-2">
      👤 {truck.driver} · 📍 {truck.route}
    </div>
    <div className="flex items-center gap-2">
      <span className={cn("text-xs font-mono w-8 shrink-0 tabular-nums", fuelText(truck.fuel))}>
        {truck.fuel}%
      </span>
      <FuelBar pct={truck.fuel} />
      <span className="text-xs text-slate-500 font-mono shrink-0 w-16 text-right tabular-nums">
        {truck.speed} km/h
      </span>
    </div>
  </div>
);

const FuelGauge = ({ truck }: { truck: Truck }) => {
  const gaugeColor =
    truck.fuel > 50 ? "#22C55E" : truck.fuel > 20 ? "#F59E0B" : "#EF4444";
  const circumf = 314;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 120" className="w-36 h-36">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#1E2840" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={gaugeColor}
          strokeWidth="10"
          strokeDasharray={`${(truck.fuel / 100) * circumf} ${circumf}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text
          x="60"
          y="55"
          textAnchor="middle"
          fill={gaugeColor}
          fontSize="22"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {truck.fuel}%
        </text>
        <text x="60" y="70" textAnchor="middle" fill="#7A8899" fontSize="8.5" fontFamily="sans-serif">
          Fuel Level
        </text>
        <text x="60" y="82" textAnchor="middle" fill="#4A5568" fontSize="8" fontFamily="monospace">
          {Math.round(truck.fuel * 4)} / 400 L
        </text>
      </svg>
    </div>
  );
};

// ── charts ───────────────────────────────────────────────────────────────────
const FuelHistoryChart = ({
  data,
}: {
  data: { time: string; l100: number; target: number }[];
}) => (
  <ResponsiveContainer width="100%" height={180}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#1C2436" />
      <XAxis
        dataKey="time"
        tick={{ fill: "#4A5568", fontSize: 9 }}
        axisLine={false}
        tickLine={false}
        interval={5}
      />
      <YAxis
        tick={{ fill: "#4A5568", fontSize: 9 }}
        axisLine={false}
        tickLine={false}
        domain={[20, 60]}
      />
      <Tooltip
        contentStyle={{
          background: "#0E1118",
          border: "1px solid #1C2436",
          borderRadius: 6,
          fontSize: 11,
        }}
      />
      <Area
        type="monotone"
        dataKey="l100"
        stroke="#F59E0B"
        strokeWidth={2}
        fill="url(#fuelGrad)"
        name="L/100km"
      />
      <Line
        type="monotone"
        dataKey="target"
        stroke="#22C55E"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        dot={false}
        name="Target"
      />
    </AreaChart>
  </ResponsiveContainer>
);

const SpeedChart = ({ data }: { data: { t: number; spd: number }[] }) => (
  <ResponsiveContainer width="100%" height={180}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="spdGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#1C2436" />
      <XAxis
        dataKey="t"
        tick={{ fill: "#4A5568", fontSize: 9 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: "#4A5568", fontSize: 9 }}
        axisLine={false}
        tickLine={false}
        domain={[0, 120]}
      />
      <Tooltip
        contentStyle={{
          background: "#0E1118",
          border: "1px solid #1C2436",
          borderRadius: 6,
          fontSize: 11,
        }}
      />
      <Area
        type="monotone"
        dataKey="spd"
        stroke="#3B82F6"
        strokeWidth={2}
        fill="url(#spdGrad)"
        name="Speed (km/h)"
      />
    </AreaChart>
  </ResponsiveContainer>
);

// ── pages ────────────────────────────────────────────────────────────────────
const TruckDetails = ({
  truck,
  onBack,
}: {
  truck: Truck;
  onBack: () => void;
}) => {
  const fuelHistory = useRef(genFuelHistory(38)).current;
  const speedHistory = useRef(genSpeedHistory(truck.speed)).current;
  const overdue = new Date(`${truck.nextService}T00:00:00`) < new Date();

  const InfoRow = ({
    label,
    value,
    valueClass = "text-white font-mono",
  }: {
    label: string;
    value: string;
    valueClass?: string;
  }) => (
    <div className="flex justify-between py-2.5 border-b border-slate-700/20 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          ← Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">{truck.name}</h1>
          <p className="text-xs text-slate-400 font-mono">
            {truck.plate} · {truck.model} · {truck.year}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={truck.status} />
        </div>
      </div>

      {overdue && (
        <Alert className="border-red-500/40 bg-red-500/10 text-red-400">
          <AlertDescription>
            ⚠ Maintenance overdue. Last service: {truck.lastService}. Immediate inspection required.
          </AlertDescription>
        </Alert>
      )}

      {truck.fuel < 20 && (
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-400">
          <AlertDescription>
            ⛽ Critical fuel level ({truck.fuel}%). Immediate refuel required — est. range:{" "}
            {Math.round((truck.fuel * 4 * 100) / 38)} km.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        <KPICard icon="⛽" label="Fuel Level" value={`${truck.fuel}%`} valueClass={fuelText(truck.fuel)} sub="Tank: 400 L" />
        <KPICard icon="🚀" label="Current Speed" value={`${truck.speed} km/h`} valueClass={truck.speed > 90 ? "text-red-400" : "text-blue-400"} sub="Limit: 100 km/h" />
        <KPICard icon="📍" label="Odometer" value={`${truck.odometer.toLocaleString()} km`} valueClass="text-blue-400" sub="Total distance" />
        <KPICard icon="🔧" label="Next Service" value={truck.nextService} valueClass={overdue ? "text-red-400" : "text-amber-400"} sub={overdue ? "OVERDUE" : "Scheduled"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-0 pt-4 px-5">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Fuel Consumption · 24H</p>
            <p className="text-xs text-slate-500 mt-0.5">L/100km vs target (38)</p>
          </CardHeader>
          <CardContent className="pt-3 px-5">
            <FuelHistoryChart data={fuelHistory} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-0 pt-4 px-5">
            <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">Speed Profile · Last 20 Readings</p>
            <p className="text-xs text-slate-500 mt-0.5">km/h · real-time samples</p>
          </CardHeader>
          <CardContent className="pt-3 px-5">
            <SpeedChart data={speedHistory} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Truck Information</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <InfoRow label="Driver" value={truck.driver} />
            <InfoRow label="Truck ID" value={truck.id} valueClass="text-amber-400 font-mono tabular-nums" />
            <InfoRow label="Plate" value={truck.plate} />
            <InfoRow label="Model" value={truck.model} />
            <InfoRow label="Route" value={truck.route} valueClass="text-blue-400 font-mono text-xs" />
            <InfoRow label="Last Service" value={truck.lastService} />
            <InfoRow label="Next Service" value={truck.nextService} valueClass={cn("font-mono tabular-nums", overdue ? "text-red-400" : "text-emerald-400")} />
            <InfoRow label="Odometer" value={`${truck.odometer.toLocaleString()} km`} />
            <InfoRow label="GPS" value={`${truck.lat.toFixed(4)}°N, ${truck.lng.toFixed(4)}°E`} valueClass="text-slate-400 font-mono text-xs tabular-nums" />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Fuel Tank Status</p>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col items-center gap-4">
            <FuelGauge truck={truck} />
            <div className="w-full bg-slate-900/60 rounded-lg p-3 space-y-2 text-sm">
              {[
                ["Tank Capacity", "400 L"],
                ["Current Level", `${Math.round(truck.fuel * 4)} L (${truck.fuel}%)`],
                ["Est. Range", `${Math.round((truck.fuel * 4 * 100) / 38)} km`],
                ["Efficiency", "38 L/100km"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1 border-b border-slate-700/20">
                  <span className="text-slate-400">{l}</span>
                  <span className="font-mono text-white tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState("admin@trackiq.ng");
  const [pass, setPass] = useState("password");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!email || !pass) {
      setErr("Enter your email and password.");
      return;
    }
    setLoading(true);
    setErr("");
    setTimeout(() => {
      if (pass === "password") {
        onLogin({ name: "Operations Manager", email, role: "Admin" });
      } else {
        setErr("Invalid credentials. Hint: password");
        setLoading(false);
      }
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
                🚛
              </div>
              <h1 className="text-2xl font-extrabold tracking-wide text-white">TrackIQ</h1>
              <p className="text-xs text-slate-400 mt-1">Fleet Intelligence Platform · Nigeria</p>
            </div>

            <div className="space-y-4">
              {[
                { label: "Email Address", val: email, set: setEmail, type: "email", ph: "admin@trackiq.ng" },
                { label: "Password", val: pass, set: setPass, type: "password", ph: "••••••••" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
                  <input
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    type={f.type}
                    placeholder={f.ph}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
              ))}

              {err && <p className="text-red-400 text-xs">⚠ {err}</p>}

              <Button
                onClick={submit}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm py-5 mt-2"
              >
                {loading ? "Authenticating…" : "Sign In →"}
              </Button>
            </div>

            <p className="text-center text-xs text-slate-600 mt-6">
              Demo · any email · password:{" "}
              <span className="text-amber-500/80 font-mono">password</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const NAV = [
  { id: "dashboard", icon: "⬛", label: "Dashboard" },
  { id: "map", icon: "🗺️", label: "Live Map" },
  { id: "trucks", icon: "🚛", label: "Trucks" },
  { id: "fuel", icon: "⛽", label: "Fuel" },
  { id: "reports", icon: "📋", label: "Reports" },
];

const Sidebar = ({
  activeNav,
  onNav,
  user,
  onLogout,
}: {
  activeNav: string;
  onNav: (id: string) => void;
  user: User;
  onLogout: () => void;
}) => (
  <aside className="hidden md:flex w-52 shrink-0 bg-slate-900 border-r border-slate-700/50 flex-col">
    <div className="px-5 py-5 border-b border-slate-700/50">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-xl">🚛</div>
        <div>
          <p className="text-base font-extrabold tracking-wide text-white">TrackIQ</p>
          <p className="text-[10px] text-slate-500">Fleet Intelligence</p>
        </div>
      </div>
    </div>

    <nav className="flex-1 p-2.5 space-y-0.5">
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => onNav(n.id)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
            activeNav === n.id
              ? "bg-amber-500/20 text-amber-400"
              : "text-slate-400 hover:bg-slate-700/40 hover:text-white"
          )}
        >
          <span className="text-base">{n.icon}</span> {n.label}
        </button>
      ))}
    </nav>

    <div className="p-4 border-t border-slate-700/50">
      <p className="text-sm font-semibold text-white">{user.name}</p>
      <p className="text-xs text-slate-400 mb-3">{user.role}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onLogout}
        className="w-full border-slate-600 text-slate-400 hover:bg-slate-700 text-xs"
      >
        Sign Out
      </Button>
    </div>
  </aside>
);

const Dashboard = ({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) => {
  const [trucks, setTrucks] = useState<Truck[]>(TRUCKS);
  const [selId, setSelId] = useState<string | null>(null);
  const [view, setView] = useState("dashboard");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(() => {
    const t = setInterval(() => {
      setTrucks((prev) =>
        prev.map((tr) => {
          if (tr.status !== "moving") return tr;
          return {
            ...tr,
            lat: tr.lat + (Math.random() - 0.5) * 0.008,
            lng: tr.lng + (Math.random() - 0.5) * 0.008,
            fuel: +Math.max(0, tr.fuel - (Math.random() < 0.3 ? Math.random() * 0.3 : 0)).toFixed(1),
            speed: +Math.max(30, Math.min(100, tr.speed + (Math.random() - 0.5) * 8)).toFixed(0),
          };
        })
      );
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const openDetail = (id: string) => {
    setDetailId(id);
    setView("detail");
  };

  const moving = trucks.filter((t) => t.status === "moving").length;
  const alerts = trucks.filter((t) => t.status === "alert").length;
  const avgFuel = (trucks.reduce((a, t) => a + t.fuel, 0) / trucks.length).toFixed(0);
  const avgSpd = +(
    trucks.filter((t) => t.status === "moving").reduce((a, t) => a + t.speed, 0) /
    Math.max(1, moving)
  ).toFixed(0);
  const detailTruck = trucks.find((t) => t.id === detailId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex" style={{ fontFamily: "Inter, sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <Sidebar
        activeNav={activeNav}
        onNav={(id) => {
          setActiveNav(id);
          setView("dashboard");
        }}
        user={user}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 md:p-7 overflow-y-auto">
        {view === "detail" && detailTruck ? (
          <TruckDetails truck={detailTruck} onBack={() => setView("dashboard")} />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-white">Fleet Overview</h1>
                <p className="text-xs text-slate-400 mt-0.5">Live data · auto-refreshing every 2 s</p>
              </div>
              <div className="flex items-center gap-2">
                <LiveDot pulse color="bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono">LIVE</span>
                <span className="text-xs text-slate-500 ml-3">
                  {new Date().toLocaleDateString("en-NG", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>

            {alerts > 0 && (
              <Alert
                className="border-red-500/40 bg-red-500/10 text-red-400 cursor-pointer"
                onClick={() => openDetail(trucks.find((t) => t.status === "alert")?.id ?? "")}
              >
                <AlertDescription>
                  ⚠ {alerts} truck{alerts > 1 ? "s" : ""} need{alerts === 1 ? "s" : ""} immediate attention. Click to view.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <KPICard icon="🚛" label="Active Trucks" value={`${moving}/${trucks.length}`} valueClass={moving > 0 ? "text-emerald-400" : "text-slate-400"} sub={`${alerts} alert${alerts !== 1 ? "s" : ""}`} />
              <KPICard icon="⛽" label="Avg Fuel Level" value={`${avgFuel}%`} valueClass={fuelText(+avgFuel)} sub="Across all trucks" />
              <KPICard icon="🚀" label="Avg Speed" value={`${avgSpd} km/h`} valueClass="text-blue-400" sub="Moving trucks only" />
              <KPICard icon="⚠️" label="Alerts" value={alerts} valueClass={alerts > 0 ? "text-red-400" : "text-emerald-400"} sub={alerts > 0 ? "Requires attention" : "All clear"} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
              <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
                <CardHeader className="py-3 px-5 border-b border-slate-700/30">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Live Fleet Map · Nigeria</p>
                    <div className="flex gap-4 text-xs text-slate-400">
                      {[["bg-emerald-400", "Moving"], ["bg-slate-500", "Idle"], ["bg-red-400", "Alert"]].map(([c, l]) => (
                        <span key={l} className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", c)} />
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <div className="h-[330px]">
                  <NigeriaMap
                    trucks={trucks}
                    selectedId={selId}
                    onSelect={(id) => {
                      setSelId(id);
                      openDetail(id);
                    }}
                  />
                </div>
              </Card>

              <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
                <CardHeader className="py-3 px-5 border-b border-slate-700/30">
                  <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">All Trucks</p>
                </CardHeader>
                <div className="overflow-y-auto h-[330px]">
                  {trucks.map((t) => (
                    <TruckListItem key={t.id} truck={t} onClick={() => openDetail(t.id)} />
                  ))}
                </div>
              </Card>
            </div>

            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="py-4 px-5 border-b border-slate-700/30">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Fuel Monitoring · All Trucks</p>
                    <p className="text-xs text-slate-500 mt-0.5">Current fuel level — click a bar for details</p>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    {[["bg-emerald-500", "Normal >50%"], ["bg-amber-500", "Low 20–50%"], ["bg-red-500", "Critical <20%"]].map(([c, l]) => (
                      <span key={l} className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-sm", c)} />
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex gap-4 items-end h-28">
                  {trucks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openDetail(t.id)}
                      className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
                    >
                      <span className={cn("text-xs font-mono font-bold group-hover:scale-110 transition-transform tabular-nums", fuelText(t.fuel))}>
                        {t.fuel}%
                      </span>
                      <div className="w-full bg-slate-700 rounded-lg h-20 flex items-end overflow-hidden">
                        <div
                          className={cn("w-full rounded-lg transition-all duration-700", fuelTw(t.fuel))}
                          style={{ height: `${t.fuel}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{t.id.slice(4)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

// ── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);

  return user ? (
    <Dashboard user={user} onLogout={() => setUser(null)} />
  ) : (
    <Login onLogin={setUser} />
  );
}

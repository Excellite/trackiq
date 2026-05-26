"use client";

import { Truck } from "@/data/trucks";

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

const markerColor = (s: string) =>
  s === "moving"
    ? "#22C55E"
    : s === "alert"
    ? "#EF4444"
    : s === "idle"
    ? "#64748B"
    : "#374151";

export function NigeriaMap({
  trucks,
  selectedId,
  onSelect,
}: {
  trucks: Truck[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
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
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="none"
                stroke={mc}
                strokeWidth="0.6"
                opacity="0.4"
              />
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
}

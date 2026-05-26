import { Truck } from "@/data/trucks";

export function FuelGauge({ truck }: { truck: Truck }) {
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
}

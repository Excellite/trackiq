import { cn } from "@/lib/cn";
import { fuelTw } from "@/lib/constants";

export function FuelBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700", fuelTw(pct))}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

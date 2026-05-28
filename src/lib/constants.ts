export const STATUS: Record<string, { label: string; tw: string; dot: string }> = {
  moving: {
    label: "Moving",
    tw:  "bg-emerald-600 text-white",
    dot: "bg-emerald-300",
  },
  idle: {
    label: "Idle",
    tw:  "bg-gray-600 text-gray-200",
    dot: "bg-gray-400",
  },
  alert: {
    label: "Alert",
    tw:  "bg-red-600 text-white",
    dot: "bg-red-300",
  },
  offline: {
    label: "Offline",
    tw:  "bg-gray-800 text-gray-400",
    dot: "bg-gray-600",
  },
};

export const fuelTw = (f: number) =>
  f > 50 ? "bg-emerald-500" : f > 20 ? "bg-orange-500" : "bg-red-500";

export const fuelText = (f: number) =>
  f > 50 ? "text-emerald-400" : f > 20 ? "text-orange-400" : "text-red-400";

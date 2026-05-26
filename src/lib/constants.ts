export const STATUS: Record<string, { label: string; tw: string }> = {
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

export const fuelTw = (f: number) =>
  f > 50 ? "bg-emerald-500" : f > 20 ? "bg-amber-500" : "bg-red-500";

export const fuelText = (f: number) =>
  f > 50 ? "text-emerald-400" : f > 20 ? "text-amber-400" : "text-red-400";

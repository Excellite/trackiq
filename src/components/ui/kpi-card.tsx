import { cn } from "@/lib/cn";

export function KPICard({
  icon,
  label,
  value,
  sub,
  valueClass = "text-[var(--text)]",
  onClick,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-3 shadow-sm",
        onClick && "cursor-pointer hover:border-orange-300 hover:shadow-md transition-all"
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <div className={cn("text-2xl font-bold tabular-nums tracking-tight", valueClass)}>
          {value}
        </div>
        {sub && <p className="text-xs text-[var(--subtle)] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

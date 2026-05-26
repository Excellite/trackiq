import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function KPICard({
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
}) {
  return (
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
}

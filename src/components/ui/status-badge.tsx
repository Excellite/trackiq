import { cn } from "@/lib/cn";
import { STATUS } from "@/lib/constants";
import { LiveDot } from "@/components/ui/live-dot";

export function StatusBadge({ status }: { status: string }) {
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
}

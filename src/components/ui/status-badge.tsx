import { cn } from "@/lib/cn";
import { STATUS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.offline;
  const isMoving = status === "moving";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide",
        s.tw
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          s.dot,
          isMoving && "animate-pulse"
        )}
      />
      {s.label}
    </span>
  );
}

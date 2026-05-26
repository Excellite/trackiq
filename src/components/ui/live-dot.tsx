import { cn } from "@/lib/cn";

export function LiveDot({
  pulse = false,
  color = "bg-emerald-500",
}: {
  pulse?: boolean;
  color?: string;
}) {
  return (
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
}

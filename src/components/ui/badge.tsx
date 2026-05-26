import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "secondary";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
        variant === "default"   && "bg-amber-500/20 text-amber-400",
        variant === "outline"   && "border border-slate-600/50 text-slate-400",
        variant === "secondary" && "bg-slate-700/50 text-slate-300",
        className
      )}
      {...props}
    />
  );
}

export { Badge };

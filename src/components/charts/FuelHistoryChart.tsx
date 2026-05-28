"use client";

import {
  AreaChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTheme } from "@/lib/theme";

export function FuelHistoryChart({ data }: { data: { time: string; pct: number; min: number }[] }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#2A3A52" : "#F3F4F6"} />
        <XAxis dataKey="time" tick={{ fill: dark ? "#94A3B8" : "#6B7280", fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(data.length / 8))} />
        <YAxis tick={{ fill: dark ? "#94A3B8" : "#6B7280", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip contentStyle={{ background: dark ? "#1A2232" : "#FFFFFF", border: `1px solid ${dark ? "#2A3A52" : "#E5E7EB"}`, borderRadius: 6, fontSize: 11, color: dark ? "#E2E8F0" : "#111827" }} formatter={(v) => [`${v}%`]} />
        <Area type="monotone" dataKey="pct" stroke="#F97316" strokeWidth={2} fill="url(#fuelGrad)" name="Fuel" />
        <Line type="monotone" dataKey="min" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Min (30%)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

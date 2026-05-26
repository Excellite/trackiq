"use client";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function FuelHistoryChart({
  data,
}: {
  data: { time: string; l100: number; target: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1C2436" />
        <XAxis
          dataKey="time"
          tick={{ fill: "#4A5568", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval={5}
        />
        <YAxis
          tick={{ fill: "#4A5568", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={[20, 60]}
        />
        <Tooltip
          contentStyle={{
            background: "#0E1118",
            border: "1px solid #1C2436",
            borderRadius: 6,
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="l100"
          stroke="#F59E0B"
          strokeWidth={2}
          fill="url(#fuelGrad)"
          name="L/100km"
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke="#22C55E"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          name="Target"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

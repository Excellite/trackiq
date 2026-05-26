"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function SpeedChart({ data }: { data: { t: number; spd: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="spdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1C2436" />
        <XAxis
          dataKey="t"
          tick={{ fill: "#4A5568", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#4A5568", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 120]}
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
          dataKey="spd"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#spdGrad)"
          name="Speed (km/h)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

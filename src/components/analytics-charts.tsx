"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PLATFORM_COLORS } from "@/lib/constants";
import { ALL_PLATFORMS } from "@/lib/types";

export function ImpressionsChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" />
        <XAxis
          dataKey="date"
          stroke="#52525b"
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis stroke="#52525b" tick={{ fontSize: 11 }} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111118",
            border: "1px solid #1c1c2e",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {ALL_PLATFORMS.map((platform) => (
          <Line
            key={platform}
            type="monotone"
            dataKey={platform}
            stroke={PLATFORM_COLORS[platform]}
            strokeWidth={2}
            dot={false}
            name={platform.charAt(0).toUpperCase() + platform.slice(1)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EngagementChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" />
        <XAxis
          dataKey="platform"
          stroke="#52525b"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis stroke="#52525b" tick={{ fontSize: 11 }} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111118",
            border: "1px solid #1c1c2e",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Bar dataKey="likes" stackId="a" fill="#8b5cf6" name="Likes" radius={[0, 0, 0, 0]} />
        <Bar dataKey="comments" stackId="a" fill="#06b6d4" name="Comments" radius={[0, 0, 0, 0]} />
        <Bar dataKey="shares" stackId="a" fill="#f59e0b" name="Shares" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

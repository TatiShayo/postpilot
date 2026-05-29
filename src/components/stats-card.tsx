"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatsCard({
  label,
  value,
  icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-[#1c1c2e] bg-[#111118] p-5 flex items-start justify-between",
        className
      )}
    >
      <div className="space-y-1.5">
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <p
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {trend.positive ? "\u2191" : "\u2193"} {trend.value}
          </p>
        )}
      </div>
      <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
        {icon}
      </div>
    </motion.div>
  );
}

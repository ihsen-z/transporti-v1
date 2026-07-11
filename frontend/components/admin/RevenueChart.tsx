"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface RevenueChartProps {
  /** Number of days to show (7, 30, 90, 365) */
  days: number;
  /** Jobs data to derive revenue from */
  jobs: Array<{
    price?: number;
    status: string;
    created_at?: string;
  }>;
}

/**
 * Revenue chart component — aggregates completed job prices
 * into time buckets and renders an AreaChart.
 */
export default function RevenueChart({ days, jobs }: RevenueChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Filter completed jobs within range
    const relevantJobs = jobs.filter((j) => {
      if (!j.created_at) return false;
      const d = new Date(j.created_at);
      return d >= cutoff && (j.status === "COMPLETED" || j.status === "IN_PROGRESS");
    });

    // Determine bucket size
    let bucketLabel: (d: Date) => string;
    let bucketCount: number;

    if (days <= 7) {
      bucketCount = 7;
      bucketLabel = (d: Date) =>
        d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    } else if (days <= 30) {
      bucketCount = 30;
      bucketLabel = (d: Date) =>
        d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } else if (days <= 90) {
      // Weekly buckets
      bucketCount = Math.ceil(days / 7);
      bucketLabel = (d: Date) =>
        `S${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)} ${d.toLocaleDateString("fr-FR", { month: "short" })}`;
    } else {
      // Monthly buckets
      bucketCount = 12;
      bucketLabel = (d: Date) =>
        d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    }

    // Create daily buckets then aggregate
    const buckets: Map<string, { label: string; revenue: number; commission: number; count: number }> = new Map();

    for (let i = bucketCount - 1; i >= 0; i--) {
      const bucketDate = new Date(now.getTime() - i * (days / bucketCount) * 24 * 60 * 60 * 1000);
      const key = bucketLabel(bucketDate);
      if (!buckets.has(key)) {
        buckets.set(key, { label: key, revenue: 0, commission: 0, count: 0 });
      }
    }

    // Assign jobs to buckets
    for (const job of relevantJobs) {
      const d = new Date(job.created_at!);
      const key = bucketLabel(d);
      const bucket = buckets.get(key);
      if (bucket) {
        const price = job.price ?? 0;
        bucket.revenue += price;
        bucket.commission += price * 0.1; // 10% commission
        bucket.count += 1;
      }
    }

    return Array.from(buckets.values());
  }, [days, jobs]);

  // If no data, show a friendly message
  if (chartData.every((d) => d.revenue === 0)) {
    return (
      <div className="flex items-center justify-center h-[250px] text-neutral-400 dark:text-neutral-500 text-sm">
        Aucune donnée de revenu pour cette période
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "0.75rem",
            padding: "12px",
            color: "#f1f5f9",
            fontSize: "13px",
          }}
          formatter={(value: any, name: any) => [
            formatCurrency(Number(value) || 0),
            name === "revenue" ? "Revenu brut" : "Commission (10%)",
          ]}
          labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          name="revenue"
        />
        <Area
          type="monotone"
          dataKey="commission"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#commissionGradient)"
          name="commission"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

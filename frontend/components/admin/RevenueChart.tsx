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
import { formatCurrency, formatDate } from "@/lib/format";
import { useTheme } from "./ThemeProvider";

/* -------------------------------------------------------------------------- */
/*  Palette du graphique — charte §2                                          */
/*                                                                            */
/*  Le revenu brut prend le BLEU (identite, hierarchie), la commission prend  */
/*  le VERT (valeur). Le graphique portait un indigo #6366f1 et l ancien vert */
/*  #10b981 : deux teintes etrangeres a la charte, invisibles pour un         */
/*  balayage de classes Tailwind puisqu ecrites en hexadecimal.               */
/*                                                                            */
/*  Les grilles et les axes suivent le theme de la console : la charte est    */
/*  claire, mais l administration garde son mode sombre.                      */
/* -------------------------------------------------------------------------- */

const SERIE_REVENU = "#1E3A8A"; /* blue-700 */
const SERIE_COMMISSION = "#2FAC55"; /* green-500 */

interface RevenueChartProps {
  /** Number of days to show (7, 30, 90, 365) */
  days: number;
  /** Jobs data to derive revenue from */
  jobs: Array<{
    price?: number;
    /** Real commission of the accepted offer, served by the API */
    commission?: number;
    status: string;
    created_at?: string;
  }>;
}

/**
 * Revenue chart component — aggregates completed job prices
 * into time buckets and renders an AreaChart.
 */
export default function RevenueChart({ days, jobs }: RevenueChartProps) {
  const { isDark } = useTheme();

  // Filet de grille, encre des axes et carton d infobulle : le seul endroit du
  // graphique ou le theme change quelque chose.
  const grille = isDark ? "#334155" : "#E6EBF3";
  const encreAxe = isDark ? "#94A3B8" : "#9AA3B2";
  const fondInfobulle = isDark ? "#1E293B" : "#FFFFFF";
  const filetInfobulle = isDark ? "#334155" : "#E6EBF3";
  const encreInfobulle = isDark ? "#F1F5F9" : "#111827";

  const chartData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Filter completed jobs within range
    const relevantJobs = jobs.filter((j) => {
      if (!j.created_at) return false;
      const d = new Date(j.created_at);
      return (
        d >= cutoff && (j.status === "COMPLETED" || j.status === "IN_PROGRESS")
      );
    });

    // Determine bucket size
    let bucketLabel: (d: Date) => string;
    let bucketCount: number;

    if (days <= 7) {
      bucketCount = 7;
      bucketLabel = (d: Date) =>
        formatDate(d.toISOString(), undefined, {
          weekday: "short",
          day: "numeric",
        });
    } else if (days <= 30) {
      bucketCount = 30;
      bucketLabel = (d: Date) =>
        formatDate(d.toISOString(), undefined, {
          day: "numeric",
          month: "short",
        });
    } else if (days <= 90) {
      // Weekly buckets
      bucketCount = Math.ceil(days / 7);
      bucketLabel = (d: Date) =>
        `S${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)} ${formatDate(d.toISOString(), undefined, { month: "short" })}`;
    } else {
      // Monthly buckets
      bucketCount = 12;
      bucketLabel = (d: Date) =>
        formatDate(d.toISOString(), undefined, {
          month: "short",
          year: "2-digit",
        });
    }

    // Create daily buckets then aggregate
    const buckets: Map<
      string,
      { label: string; revenue: number; commission: number; count: number }
    > = new Map();

    for (let i = bucketCount - 1; i >= 0; i--) {
      const bucketDate = new Date(
        now.getTime() - i * (days / bucketCount) * 24 * 60 * 60 * 1000,
      );
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
        bucket.commission += job.commission ?? 0; // real commission from API
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
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIE_REVENU} stopOpacity={0.26} />
            <stop offset="95%" stopColor={SERIE_REVENU} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIE_COMMISSION} stopOpacity={0.26} />
            <stop offset="95%" stopColor={SERIE_COMMISSION} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grille} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fontWeight: 600, fill: encreAxe }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fontWeight: 600, fill: encreAxe }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: fondInfobulle,
            border: `1px solid ${filetInfobulle}`,
            /* Rayon de tuile de la charte, et son ombre teintee bleu marine */
            borderRadius: "18px",
            padding: "12px 14px",
            color: encreInfobulle,
            fontSize: "13px",
            boxShadow: "0 10px 26px rgba(15,29,78,0.08)",
          }}
          formatter={(value: any, name: any) => [
            formatCurrency(Number(value) || 0),
            name === "revenue" ? "Revenu brut" : "Commission",
          ]}
          labelStyle={{ color: encreAxe, marginBottom: "4px", fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={SERIE_REVENU}
          strokeWidth={2}
          fill="url(#revenueGradient)"
          name="revenue"
        />
        <Area
          type="monotone"
          dataKey="commission"
          stroke={SERIE_COMMISSION}
          strokeWidth={2}
          fill="url(#commissionGradient)"
          name="commission"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

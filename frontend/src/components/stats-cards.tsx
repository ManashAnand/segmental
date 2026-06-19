"use client";

import { motion } from "framer-motion";
import {
  Building2,
  FileBarChart2,
  Layers,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

export function StatsCards() {
  const docs = useAppStore((s) => s.documents);

  const processed = docs.filter((d) => d.status === "processed");
  const totalFields = processed.reduce((s, d) => s + d.fieldsExtracted, 0);
  const avgAccuracy = processed.length
    ? Math.round(
        (processed.reduce((sum, d) => sum + d.accuracy, 0) / processed.length) *
          1000,
      ) / 10
    : 0;
  const companies = new Set(docs.map((d) => d.company)).size;

  const cards = [
    {
      label: "Total Reports",
      value: docs.length.toString(),
      delta: "+12%",
      trend: "up" as const,
      icon: FileBarChart2,
      tint: "from-chart-1/20 to-chart-1/0",
      iconColor: "text-chart-1",
    },
    {
      label: "Extraction Accuracy",
      value: `${avgAccuracy}%`,
      delta: "+2.4%",
      trend: "up" as const,
      icon: Target,
      tint: "from-chart-3/20 to-chart-3/0",
      iconColor: "text-chart-3",
    },
    {
      label: "Metrics Extracted",
      value: totalFields.toLocaleString(),
      delta: "+184",
      trend: "up" as const,
      icon: Layers,
      tint: "from-chart-2/20 to-chart-2/0",
      iconColor: "text-chart-2",
    },
    {
      label: "Companies Processed",
      value: companies.toString(),
      delta: "−1",
      trend: "down" as const,
      icon: Building2,
      tint: "from-chart-4/20 to-chart-4/0",
      iconColor: "text-chart-4",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const Trend = c.trend === "up" ? TrendingUp : TrendingDown;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3 }}
            className="glow-card group relative p-5"
          >
            <div
              className={`absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${c.tint} opacity-0 transition-opacity group-hover:opacity-100`}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <div
                className={`grid h-8 w-8 place-items-center rounded-lg bg-muted/50 ${c.iconColor}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-2">
              <span className="text-3xl font-semibold tracking-tight">{c.value}</span>
              <span
                className={`flex items-center gap-1 text-xs ${
                  c.trend === "up" ? "text-success" : "text-destructive"
                }`}
              >
                <Trend className="h-3 w-3" /> {c.delta}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

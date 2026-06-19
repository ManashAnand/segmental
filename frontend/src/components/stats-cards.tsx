"use client";

import { motion } from "framer-motion";
import {
  Building2,
  FileBarChart2,
  Layers,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAppStore, useDocumentStats } from "@/lib/store";

function AnimatedValue({ value }: { value: string | number }) {
  return (
    <motion.span
      key={String(value)}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="text-3xl font-semibold tracking-tight tabular-nums"
    >
      {value}
    </motion.span>
  );
}

export function StatsCards() {
  const stats = useDocumentStats();
  const recentlyAdded = useAppStore((s) => s.recentlyAddedIds);
  const pulse = recentlyAdded.length > 0;

  const cards = [
    {
      key: "reports",
      label: "Total Reports",
      value: stats.totalReports,
      delta: pulse ? `+${recentlyAdded.length} new` : `${stats.processedCount} processed`,
      icon: FileBarChart2,
      tint: "from-chart-1/20 to-chart-1/0",
      iconColor: "text-chart-1",
    },
    {
      key: "accuracy",
      label: "Extraction Accuracy",
      value: `${stats.avgAccuracy}%`,
      delta: "live avg",
      icon: Target,
      tint: "from-chart-3/20 to-chart-3/0",
      iconColor: "text-chart-3",
    },
    {
      key: "metrics",
      label: "Chunks Indexed",
      value: stats.totalFields.toLocaleString(),
      delta: pulse ? "updated" : "total fields",
      icon: Layers,
      tint: "from-chart-2/20 to-chart-2/0",
      iconColor: "text-chart-2",
    },
    {
      key: "companies",
      label: "Companies Processed",
      value: stats.companies,
      delta: "unique slugs",
      icon: Building2,
      tint: "from-chart-4/20 to-chart-4/0",
      iconColor: "text-chart-4",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const isNew = pulse && (c.key === "reports" || c.key === "metrics");

        return (
          <motion.div
            key={c.key}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: isNew ? [1, 1.03, 1] : 1,
              boxShadow: isNew
                ? [
                    "0 0 0 0 rgba(139,92,246,0)",
                    "0 0 0 4px rgba(139,92,246,0.25)",
                    "0 0 0 0 rgba(139,92,246,0)",
                  ]
                : undefined,
            }}
            transition={{
              delay: i * 0.06,
              scale: { duration: 0.6 },
              boxShadow: { duration: 0.8 },
            }}
            whileHover={{ y: -3 }}
            className="glow-card group relative overflow-hidden p-5"
          >
            <div
              className={`absolute inset-0 -z-10 bg-gradient-to-br ${c.tint} opacity-0 transition-opacity group-hover:opacity-100`}
            />
            {isNew && (
              <motion.div
                initial={{ opacity: 0.6, scaleX: 0 }}
                animate={{ opacity: 0, scaleX: 1 }}
                transition={{ duration: 0.9 }}
                className="absolute inset-x-0 top-0 h-0.5 origin-left bg-gradient-to-r from-primary to-chart-3"
              />
            )}
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
              <AnimatedValue value={c.value} />
              <span className="flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" /> {c.delta}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

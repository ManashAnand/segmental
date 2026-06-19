"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Globe2, Layers, Beaker, Activity } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import {
  accuracyTrend,
  metricsForDoc,
  mockMetrics,
} from "@/lib/mock-data";

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 11,
  color: "var(--popover-foreground)",
};

export function InsightsPanel() {
  const selectedId = useAppStore((s) => s.selectedDocId);
  const metrics = selectedId ? metricsForDoc(selectedId) : null;

  return (
    <aside className="flex h-full w-full flex-col border-l border-border/60 bg-sidebar/40">
      <div className="border-b border-border/60 p-4">
        <h2 className="text-sm font-semibold">Financial Insights</h2>
        <p className="text-[11px] text-muted-foreground">
          {metrics ? `${metrics.company} · ${metrics.ticker}` : "Select a document"}
        </p>
      </div>

      <Tabs defaultValue="metrics" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2">
          <TabsTrigger value="metrics" className="text-xs">
            Metrics
          </TabsTrigger>
          <TabsTrigger value="charts" className="text-xs">
            Comparisons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="flex-1 overflow-y-auto p-3">
          {metrics ? (
            <div className="space-y-3">
              <InsightCard icon={Globe2} label="Revenue by Geography" tint="from-chart-2/20">
                <div className="space-y-1.5">
                  {metrics.geo.map((g, i) => (
                    <BarRow
                      key={g.region}
                      label={g.region}
                      value={g.value}
                      max={Math.max(...metrics.geo.map((x) => x.value))}
                      delay={i * 0.04}
                    />
                  ))}
                </div>
              </InsightCard>

              <InsightCard icon={Layers} label="Revenue by Segment" tint="from-chart-1/20">
                <div className="space-y-1.5">
                  {metrics.segments.map((s, i) => (
                    <BarRow
                      key={s.segment}
                      label={s.segment}
                      value={s.value}
                      max={Math.max(...metrics.segments.map((x) => x.value))}
                      delay={i * 0.04}
                      accent
                    />
                  ))}
                </div>
              </InsightCard>

              <InsightCard icon={Beaker} label="R&D Expense" tint="from-chart-3/20">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-semibold tracking-tight">
                      ${(metrics.rdExpense / 1000).toFixed(1)}B
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {((metrics.rdExpense / metrics.totalRevenue) * 100).toFixed(1)}%
                      of revenue
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-success">+12.4% YoY</div>
                    <div className="text-[11px] text-muted-foreground">
                      vs prior year
                    </div>
                  </div>
                </div>
              </InsightCard>
            </div>
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              No document selected
            </div>
          )}
        </TabsContent>

        <TabsContent value="charts" className="flex-1 space-y-3 overflow-y-auto p-3">
          <ChartCard label="Geographic Revenue (Top region)" icon={Globe2}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={Object.values(mockMetrics).map((m) => ({
                  name: m.ticker,
                  value: Math.round(m.geo[0].value / 1000),
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  unit="B"
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard label="Segment Revenue (Top segment)" icon={Layers}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={Object.values(mockMetrics).map((m) => ({
                  name: m.ticker,
                  value: Math.round(
                    Math.max(...m.segments.map((s) => s.value)) / 1000,
                  ),
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  unit="B"
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard label="R&D Spend Comparison" icon={Beaker}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={Object.values(mockMetrics).map((m) => ({
                  name: m.ticker,
                  value: Math.round(m.rdExpense / 1000),
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  unit="B"
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="value" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard label="Extraction Accuracy" icon={Activity}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={accuracyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[70, 100]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="v1"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="V1"
                />
                <Line
                  type="monotone"
                  dataKey="v2"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="V2"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function InsightCard({
  icon: Icon,
  label,
  tint,
  children,
}: {
  icon: typeof Globe2;
  label: string;
  tint: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glow-card relative overflow-hidden p-4"
    >
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${tint} to-transparent opacity-60`}
      />
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-background/60 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h4>
      </div>
      {children}
    </motion.div>
  );
}

function ChartCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe2;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="glow-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-xs font-medium">{label}</h4>
      </div>
      {children}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  delay,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  delay: number;
  accent?: boolean;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          ${(value / 1000).toFixed(1)}B
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
          className={`h-full rounded-full ${
            accent
              ? "bg-gradient-to-r from-chart-1 to-primary"
              : "bg-gradient-to-r from-chart-2 to-chart-3"
          }`}
        />
      </div>
    </div>
  );
}

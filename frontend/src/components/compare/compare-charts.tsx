"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ShowcaseReport, ShowcaseResult } from "@/lib/showcase-types";

const accuracyConfig = {
  v1: { label: "V1 Regex", color: "var(--chart-4)" },
  v2: { label: "V2 RAG + LLM", color: "var(--chart-1)" },
} satisfies ChartConfig;

const matchConfig = {
  match: { label: "Correct", color: "var(--chart-3)" },
  miss: { label: "Incorrect", color: "var(--chart-4)" },
} satisfies ChartConfig;

function shortLabel(id: string) {
  const map: Record<string, string> = {
    total_revenue: "Total Rev",
    rnd_expense: "R&D",
    segment_revenue: "Segment",
    geographic_revenue: "Geo Rev",
    net_income: "Net Inc",
  };
  return map[id] ?? id;
}

interface CompareChartsProps {
  v1: ShowcaseReport;
  v2: ShowcaseReport;
}

export function CompareCharts({ v1, v2 }: CompareChartsProps) {
  const accuracyData = [
    {
      version: "V1",
      accuracy: Math.round(v1.summary.accuracy * 100),
      fill: "var(--color-v1)",
    },
    {
      version: "V2",
      accuracy: Math.round(v2.summary.accuracy * 100),
      fill: "var(--color-v2)",
    },
  ];

  const perQuestion = v1.results.map((row) => {
    const v2Row = v2.results.find((r) => r.id === row.id);
    return {
      id: row.id,
      label: shortLabel(row.id),
      v1Match: row.match ? 100 : 0,
      v2Match: v2Row?.match ? 100 : 0,
      v1Error: row.relative_error != null ? row.relative_error * 100 : null,
      v2Error: v2Row?.relative_error != null ? v2Row.relative_error * 100 : 0,
    };
  });

  const radialData = [
    {
      name: "V2",
      value: v2.summary.accuracy * 100,
      fill: "url(#v2Gradient)",
    },
    {
      name: "V1",
      value: v1.summary.accuracy * 100,
      fill: "url(#v1Gradient)",
    },
  ];

  const cumulativeTrend = v1.results.map((row, i) => {
    const v2Row = v2.results.find((r) => r.id === row.id);
    const v1Running =
      (v1.results.slice(0, i + 1).filter((r) => r.match).length / (i + 1)) *
      100;
    const v2Running =
      (v2.results.slice(0, i + 1).filter((r) => r.match).length / (i + 1)) *
      100;
    return {
      step: shortLabel(row.id),
      v1: Math.round(v1Running),
      v2: Math.round(v2Running),
      v1Match: row.match ? 1 : 0,
      v2Match: v2Row?.match ? 1 : 0,
    };
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glow-card relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-chart-3/10 p-6 sm:p-8"
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="mb-3 border-chart-3/40 bg-chart-3/15 text-chart-3">
              <Trophy className="mr-1 h-3 w-3" />
              V2 is the clear winner
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {v2.summary.accuracy_percent} accuracy vs {v1.summary.accuracy_percent}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Alphabet FY2023 · {v2.summary.correct}/{v2.summary.total_questions}{" "}
              exact matches with V2 RAG + LLM, vs {v1.summary.correct}/
              {v1.summary.total_questions} for V1 keyword extraction.
            </p>
          </div>
          <div className="flex gap-6">
            <StatPill
              label="V1"
              value={v1.summary.accuracy_percent}
              trend="down"
              sub={`${v1.summary.correct}/${v1.summary.total_questions}`}
            />
            <StatPill
              label="V2"
              value={v2.summary.accuracy_percent}
              trend="up"
              sub={`${v2.summary.correct}/${v2.summary.total_questions}`}
              highlight
            />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvilChartCard
          title="Overall Accuracy"
          description="First-pick / query accuracy on 5 comparable checks"
          badge="+80pp V2"
          delay={0.05}
        >
          <ChartContainer config={accuracyConfig} className="h-[260px] w-full">
            <BarChart data={accuracyData} barSize={56}>
              <defs>
                <linearGradient id="v1Bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="v2Bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="version"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${value}%`, "Accuracy"]}
                  />
                }
              />
              <Bar dataKey="accuracy" radius={[10, 10, 4, 4]} animationDuration={1200}>
                {accuracyData.map((entry) => (
                  <Cell
                    key={entry.version}
                    fill={
                      entry.version === "V1"
                        ? "url(#v1Bar)"
                        : "url(#v2Bar)"
                    }
                  />
                ))}
                <LabelList
                  dataKey="accuracy"
                  position="top"
                  formatter={(v) => `${v}%`}
                  className="fill-foreground text-xs font-semibold"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </EvilChartCard>

        <EvilChartCard
          title="Accuracy Radial"
          description="Visual gap between pipeline versions"
          badge="V2 dominates"
          delay={0.1}
        >
          <ChartContainer config={accuracyConfig} className="mx-auto h-[260px] w-full max-w-[280px]">
            <RadialBarChart
              innerRadius={50}
              outerRadius={100}
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <defs>
                <linearGradient id="v2Gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" />
                  <stop offset="100%" stopColor="var(--chart-3)" />
                </linearGradient>
                <linearGradient id="v1Gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--chart-4)" />
                  <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                }
              />
              <RadialBar
                dataKey="value"
                cornerRadius={8}
                background={{ fill: "var(--muted)" }}
                animationDuration={1400}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-1" /> V2 · 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-chart-4" /> V1 · 20%
            </span>
          </div>
        </EvilChartCard>

        <EvilChartCard
          title="Per-Question Match Rate"
          description="100 = correct, 0 = wrong or unsupported"
          className="lg:col-span-2"
          delay={0.15}
        >
          <ChartContainer config={accuracyConfig} className="h-[280px] w-full">
            <BarChart data={perQuestion} barGap={4} barCategoryGap="20%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="v1Match"
                name="v1"
                fill="var(--color-v1)"
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
              />
              <Bar
                dataKey="v2Match"
                name="v2"
                fill="var(--color-v2)"
                radius={[6, 6, 0, 0]}
                animationDuration={1200}
              />
            </BarChart>
          </ChartContainer>
        </EvilChartCard>

        <EvilChartCard
          title="Running Accuracy"
          description="Cumulative match rate as each question is evaluated"
          className="lg:col-span-2"
          delay={0.2}
        >
          <ChartContainer config={accuracyConfig} className="h-[280px] w-full">
            <LineChart data={cumulativeTrend}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="step" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="v1"
                name="v1"
                stroke="var(--color-v1)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--chart-4)" }}
                animationDuration={1500}
              />
              <Line
                type="monotone"
                dataKey="v2"
                name="v2"
                stroke="var(--color-v2)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--chart-1)" }}
                animationDuration={1500}
              />
            </LineChart>
          </ChartContainer>
        </EvilChartCard>

        <EvilChartCard
          title="Relative Error (V1 only)"
          description="Where V1 picked wrong values — V2 stays at 0%"
          className="lg:col-span-2"
          delay={0.25}
        >
          <ChartContainer config={matchConfig} className="h-[260px] w-full">
            <BarChart data={perQuestion.filter((r) => r.v1Error != null)}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v}%`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, "Error"]}
                  />
                }
              />
              <Bar
                dataKey="v1Error"
                name="V1 error"
                fill="var(--chart-4)"
                radius={[8, 8, 0, 0]}
                animationDuration={1100}
              />
            </BarChart>
          </ChartContainer>
        </EvilChartCard>
      </div>
    </div>
  );
}

function EvilChartCard({
  title,
  description,
  badge,
  children,
  className,
  delay = 0,
}: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className={className}
    >
      <Card className="glow-card overflow-hidden border-border/60 bg-card/80">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {badge && (
            <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">
              {badge}
            </Badge>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function StatPill({
  label,
  value,
  sub,
  trend,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  trend: "up" | "down";
  highlight?: boolean;
}) {
  const Trend = trend === "up" ? TrendingUp : TrendingDown;
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight
          ? "border-primary/40 bg-primary/10"
          : "border-border/60 bg-muted/20"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p
        className={`mt-1 flex items-center gap-1 text-xs ${
          trend === "up" ? "text-chart-3" : "text-chart-4"
        }`}
      >
        <Trend className="h-3 w-3" />
        {sub}
      </p>
    </div>
  );
}

export function ComparisonTable({
  v1Results,
  v2Results,
}: {
  v1Results: ShowcaseResult[];
  v2Results: ShowcaseResult[];
}) {
  const rows = v1Results.map((v1Row) => ({
    v1: v1Row,
    v2: v2Results.find((r) => r.id === v1Row.id)!,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glow-card overflow-hidden"
    >
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="font-semibold">Side-by-Side Results</h3>
        <p className="text-xs text-muted-foreground">
          Ground truth vs V1 first-pick vs V2 agent answer
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Metric</th>
              <th className="px-5 py-3 font-medium">Expected</th>
              <th className="px-5 py-3 font-medium">V1 Actual</th>
              <th className="px-5 py-3 font-medium">V2 Actual</th>
              <th className="px-5 py-3 font-medium">V1</th>
              <th className="px-5 py-3 font-medium">V2</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ v1, v2 }) => (
              <tr
                key={v1.id}
                className="border-b border-border/40 transition-colors hover:bg-muted/20"
              >
                <td className="px-5 py-4">
                  <p className="font-medium">{shortLabel(v1.id)}</p>
                  <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">
                    {v1.question}
                  </p>
                </td>
                <td className="px-5 py-4 font-mono tabular-nums">
                  {v1.expected.value.toLocaleString()}
                </td>
                <td className="px-5 py-4 font-mono tabular-nums text-chart-4">
                  {v1.actual?.value?.toLocaleString() ?? "N/A"}
                </td>
                <td className="px-5 py-4 font-mono tabular-nums text-chart-3">
                  {v2.actual?.value?.toLocaleString() ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <MatchBadge match={v1.match} />
                </td>
                <td className="px-5 py-4">
                  <MatchBadge match={v2.match} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function MatchBadge({ match }: { match: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        match
          ? "border-chart-3/40 bg-chart-3/10 text-chart-3"
          : "border-chart-4/40 bg-chart-4/10 text-chart-4"
      }
    >
      {match ? "✓ Match" : "✗ Miss"}
    </Badge>
  );
}

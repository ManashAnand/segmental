"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitCompare, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import {
  CompareCharts,
  ComparisonTable,
} from "@/components/compare/compare-charts";
import { loadShowcase, type ShowcaseReport } from "@/lib/showcase-types";

export function ComparePageContent() {
  const [v1, setV1] = useState<ShowcaseReport | null>(null);
  const [v2, setV2] = useState<ShowcaseReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadShowcase("/data/v1_alphabet_showcase.json"),
      loadShowcase("/data/v2_alphabet_showcase.json"),
    ])
      .then(([a, b]) => {
        setV1(a);
        setV2(b);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load data"),
      );
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-32 top-1/4 h-80 w-80 rounded-full bg-chart-3/10 blur-[100px]" />
      </div>

      <AppHeader />

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center sm:mb-10"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <GitCompare className="h-3.5 w-3.5" />
            Pipeline Comparison · Alphabet FY2023
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            V1 vs V2 Evaluation
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Keyword regex extraction compared against RAG + LLM query agent —
            powered by EvilCharts-style animated visualizations.
          </p>
        </motion.div>

        {error && (
          <div className="glow-card border-destructive/40 p-6 text-center text-destructive">
            {error}
          </div>
        )}

        {!v1 || !v2 ? (
          !error && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              Loading showcase data…
            </div>
          )
        ) : (
          <div className="space-y-10">
            <CompareCharts v1={v1} v2={v2} />
            <ComparisonTable v1Results={v1.results} v2Results={v2.results} />
          </div>
        )}
      </main>
    </div>
  );
}

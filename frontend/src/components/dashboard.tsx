"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { AppHeader } from "./app-header";
import { RecentUploadsTable } from "./recent-uploads-table";
import { StatsCards } from "./stats-cards";
import { UploadZone } from "./upload-zone";

export function Dashboard() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-32 top-1/4 h-80 w-80 rounded-full bg-chart-2/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-chart-3/8 blur-[100px]" />
      </div>

      <AppHeader />

      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI Analyst · Powered by SEC EDGAR
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            Financial Intelligence
            <br />
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              from SEC Filings
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Upload 10-K reports and automatically extract financial metrics,
            evaluate accuracy, and interact with an AI analyst.
          </p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <UploadZone />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-14 sm:mt-16"
        >
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-sm text-muted-foreground">
              Live stats across your analysis workspace
            </p>
          </div>
          <StatsCards />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="mt-8"
        >
          <RecentUploadsTable />
        </motion.section>
      </main>
    </div>
  );
}

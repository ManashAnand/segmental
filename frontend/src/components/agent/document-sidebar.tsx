"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function DocumentSidebar() {
  const docs = useAppStore((s) => s.documents);
  const selectedId = useAppStore((s) => s.selectedDocId);
  const select = useAppStore((s) => s.selectDocument);
  const [q, setQ] = useState("");

  const filtered = docs.filter(
    (d) =>
      d.company.toLowerCase().includes(q.toLowerCase()) ||
      d.ticker.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-border/60 bg-sidebar/60">
      <div className="border-b border-border/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Documents</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link href="/">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filings..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filtered.map((d) => {
          const active = d.id === selectedId;
          return (
            <motion.button
              key={d.id}
              whileHover={{ x: 2 }}
              onClick={() => select(d.id)}
              className={`group relative w-full rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-primary/40 bg-primary/10"
                  : "border-transparent hover:border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-[10px] font-semibold ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {d.ticker.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.company}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {d.fieldsExtracted} fields ·{" "}
                    {(d.confidence * 100).toFixed(0)}% conf.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        d.status === "processed"
                          ? "bg-success"
                          : d.status === "processing"
                            ? "animate-pulse bg-warning"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {d.status}
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
        {filtered.length === 0 && (
          <div className="grid place-items-center px-4 py-12 text-center">
            <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No documents found</p>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-medium">AI Analyst Pro</p>
            <p className="truncate text-[10px] text-muted-foreground">
              Unlimited extractions
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

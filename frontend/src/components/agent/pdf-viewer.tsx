"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  MoreHorizontal,
  LayoutGrid,
  FileText,
  Paperclip,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { metricsForDoc, type DocMetrics } from "@/lib/mock-data";
import type { UploadedDoc } from "@/lib/mock-data";

type Tab = "files" | "checklist" | "form";

export function PdfViewer() {
  const docs = useAppStore((s) => s.documents);
  const selectedId = useAppStore((s) => s.selectedDocId);
  const select = useAppStore((s) => s.selectDocument);
  const [tab, setTab] = useState<Tab>("files");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(110);

  const doc = docs.find((d) => d.id === selectedId) ?? docs[0];
  const metrics = doc ? metricsForDoc(doc.id) : null;
  const totalPages = 12;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-sidebar/40 px-2 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> All
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {docs.map((d) => (
              <DropdownMenuItem
                key={d.id}
                onClick={() => select(d.id)}
                className="gap-2"
              >
                <span className="grid h-6 w-6 place-items-center rounded bg-muted text-[10px] font-semibold">
                  {d.ticker.slice(0, 2)}
                </span>
                <span className="truncate">{d.company}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="mx-1 h-5 w-px bg-border" />
        {docs.map((d) => {
          const active = d.id === doc?.id;
          return (
            <button
              key={d.id}
              onClick={() => select(d.id)}
              className={`group inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  d.status === "processed"
                    ? "bg-success"
                    : d.status === "processing"
                      ? "bg-warning"
                      : "bg-muted-foreground"
                }`}
              />
              <FileText className="h-3 w-3 opacity-60" />
              {d.ticker}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          {(["files", "checklist", "form"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-1 capitalize transition-colors ${
                tab === t
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "form" ? "Incorporation Form" : t}
              {tab === t && (
                <motion.span
                  layoutId="pdf-tab"
                  className="absolute inset-x-0 -bottom-[9px] h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          <span className="max-w-[180px] truncate sm:max-w-none">
            {doc?.fileName ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs">
            <input
              type="number"
              value={page}
              onChange={(e) =>
                setPage(
                  Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)),
                )
              }
              className="w-8 bg-transparent text-center outline-none tabular-nums"
            />
            <span className="text-muted-foreground">/ {totalPages}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums">{zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden h-7 w-7 sm:inline-flex">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-7 w-7 sm:inline-flex">
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-6">
        {tab === "files" && doc && (
          <FilesView doc={doc} zoom={zoom} page={page} metrics={metrics} />
        )}
        {tab === "checklist" && <ChecklistView />}
        {tab === "form" && <FormView doc={doc} />}
      </div>
    </div>
  );
}

function FilesView({
  doc,
  zoom,
  page,
  metrics,
}: {
  doc: UploadedDoc;
  zoom: number;
  page: number;
  metrics: DocMetrics | null;
}) {
  return (
    <motion.div
      key={`${doc.id}-${page}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto rounded-md bg-white text-zinc-900 shadow-2xl ring-1 ring-black/10"
      style={{ width: `${(zoom / 100) * 720}px`, maxWidth: "100%" }}
    >
      <div className="p-6 sm:p-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              United States
            </div>
            <div className="text-xs font-semibold text-zinc-700">
              Securities and Exchange Commission
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl font-bold tracking-tight">FORM 10-K</div>
            <div className="text-[10px] text-zinc-500">
              Annual Report · Fiscal Year {new Date().getFullYear() - 1}
            </div>
          </div>
        </div>

        <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {doc.company}
        </h1>
        <p className="mb-6 text-sm text-zinc-600">
          (Exact name of Registrant as specified in its charter) · Ticker:{" "}
          <span className="font-mono font-semibold">{doc.ticker}</span>
        </p>

        <div className="mb-6 overflow-x-auto rounded border border-zinc-200">
          <table className="w-full min-w-[320px] text-xs">
            <tbody className="divide-y divide-zinc-200">
              <tr>
                <td className="bg-zinc-50 px-3 py-2 font-medium" colSpan={2}>
                  Company Details — Page {page}
                </td>
              </tr>
              <tr>
                <td className="w-1/2 px-3 py-2 text-zinc-600">a. Registrant Name</td>
                <td className="px-3 py-2 font-medium">{doc.company.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-600">b. Ticker Symbol</td>
                <td className="px-3 py-2 font-mono">{doc.ticker}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-600">c. Total Revenue</td>
                <td className="px-3 py-2">
                  {metrics ? `$${(metrics.totalRevenue / 1000).toFixed(2)}B` : "—"}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-600">d. R&D Expense</td>
                <td className="px-3 py-2">
                  {metrics ? `$${(metrics.rdExpense / 1000).toFixed(2)}B` : "—"}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-600">e. Fiscal Year End</td>
                <td className="px-3 py-2">
                  December 31, {new Date().getFullYear() - 1}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-600">f. Filed With</td>
                <td className="px-3 py-2">SEC EDGAR</td>
              </tr>
            </tbody>
          </table>
        </div>

        {metrics && (
          <div className="mb-6 overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold">
              Revenue by Geographic Segment
            </h3>
            <table className="w-full min-w-[360px] border border-zinc-200 text-xs">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Region
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-600">
                    FY (in $M)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-600">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {metrics.geo.map((g) => (
                  <tr key={g.region}>
                    <td className="px-3 py-2">{g.region}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {g.value.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-600">
                      {((g.value / metrics.totalRevenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs leading-relaxed text-zinc-600">
          The information contained in Item 7 of this Form 10-K is intended to
          provide a narrative discussion of the Registrant&apos;s financial condition
          and results of operations as required under SEC regulations.
          Forward-looking statements are subject to risks and uncertainties...
        </p>

        <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-3 text-[10px] text-zinc-400">
          <span>{doc.fileName}</span>
          <span>
            Page {page} of {12}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ChecklistView() {
  const items = [
    { label: "Business overview extracted", done: true },
    { label: "Risk factors section parsed", done: true },
    { label: "MD&A financial commentary", done: true },
    { label: "Income statement extracted", done: true },
    { label: "Balance sheet extracted", done: true },
    { label: "Cash flow statement extracted", done: true },
    { label: "Segment reporting validated", done: true },
    { label: "Geographic revenue extracted", done: true },
    { label: "R&D expense extracted", done: true },
    { label: "Auditor's report cross-checked", done: false },
    { label: "Exhibits & schedules indexed", done: false },
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <h3 className="mb-3 text-sm font-semibold">Extraction Checklist</h3>
      {items.map((it) => (
        <div
          key={it.label}
          className="glow-card flex items-center justify-between p-3"
        >
          <div className="flex items-center gap-3">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                it.done
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {it.done ? "✓" : "·"}
            </span>
            <span className="text-sm">{it.label}</span>
          </div>
          <span
            className={`text-[11px] uppercase tracking-wider ${
              it.done ? "text-success" : "text-muted-foreground"
            }`}
          >
            {it.done ? "Complete" : "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
}

function FormView({ doc }: { doc: UploadedDoc | undefined }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="glow-card p-6">
        <h3 className="mb-1 text-sm font-semibold">Filing Metadata</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Auto-extracted from cover page
        </p>
        <div className="space-y-3">
          {[
            ["Filing Type", "10-K Annual Report"],
            ["Registrant", doc?.company ?? "—"],
            ["Ticker", doc?.ticker ?? "—"],
            ["Filing Date", `December 31, ${new Date().getFullYear() - 1}`],
            ["State of Incorporation", "Delaware"],
            ["Filed With", "SEC EDGAR"],
            ["Auditor", "Independent Registered Public Accounting Firm"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between border-b border-border/40 pb-2 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-right text-xs sm:text-sm">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

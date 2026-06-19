"use client";

import { useEffect, useState } from "react";
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
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { companyPdfUrl, fetchCompanyPdfBlob, getCompanyInfo } from "@/lib/api";
import { useAppStore, useSelectedDocument } from "@/lib/store";

type Tab = "files" | "checklist" | "form";

export function PdfViewer() {
  const docs = useAppStore((s) => s.documents);
  const select = useAppStore((s) => s.selectDocument);
  const pdfPage = useAppStore((s) => s.pdfPage);
  const pdfTargetPage = useAppStore((s) => s.pdfTargetPage);
  const setPdfPage = useAppStore((s) => s.setPdfPage);
  const clearPdfTargetPage = useAppStore((s) => s.clearPdfTargetPage);
  const companyInfoBySlug = useAppStore((s) => s.companyInfoBySlug);
  const setCompanyInfo = useAppStore((s) => s.setCompanyInfo);
  const doc = useSelectedDocument();
  const [tab, setTab] = useState<Tab>("files");
  const [zoom, setZoom] = useState(110);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  const info = doc ? companyInfoBySlug[doc.companySlug] : undefined;
  const totalPages = info?.page_count ?? 1;
  const pdfAvailable = info?.pdf_available ?? false;
  const indexed = info?.indexed ?? false;

  useEffect(() => {
    if (!doc?.companySlug) return;

    const cached = useAppStore.getState().companyInfoBySlug[doc.companySlug];
    if (cached) return;

    let cancelled = false;
    setLoadingInfo(true);
    setInfoError(null);

    getCompanyInfo(doc.companySlug)
      .then((result) => {
        if (!cancelled) setCompanyInfo(doc.companySlug, result);
      })
      .catch((error) => {
        if (!cancelled) {
          setInfoError(
            error instanceof Error ? error.message : "Failed to load filing info",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doc?.companySlug, setCompanyInfo]);

  useEffect(() => {
    if (!doc?.companySlug || !pdfAvailable) {
      setPdfBlobUrl(null);
      setPdfError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoadingPdf(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    fetchCompanyPdfBlob(doc.companySlug)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) {
          setPdfError(
            error instanceof Error ? error.message : "Failed to load PDF",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPdfBlobUrl((current) => {
        if (current && current !== objectUrl) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [doc?.companySlug, pdfAvailable]);

  useEffect(() => {
    if (pdfTargetPage != null) {
      setPdfPage(pdfTargetPage);
      clearPdfTargetPage();
    }
  }, [pdfTargetPage, setPdfPage, clearPdfTargetPage]);

  useEffect(() => {
    if (pdfPage > totalPages) {
      setPdfPage(totalPages);
    }
  }, [pdfPage, totalPages, setPdfPage]);

  const iframeSrc = pdfBlobUrl ? `${pdfBlobUrl}#page=${pdfPage}` : null;

  const handleDownload = async () => {
    if (!doc) return;
    try {
      if (pdfBlobUrl) {
        const anchor = document.createElement("a");
        anchor.href = pdfBlobUrl;
        anchor.download = doc.fileName;
        anchor.click();
        return;
      }
      const blob = await fetchCompanyPdfBlob(doc.companySlug);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(companyPdfUrl(doc.companySlug), "_blank", "noopener,noreferrer");
    }
  };

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
            onClick={() => setPdfPage(Math.max(1, pdfPage - 1))}
            disabled={!pdfAvailable}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs">
            <input
              type="number"
              value={pdfPage}
              onChange={(e) =>
                setPdfPage(
                  Math.min(totalPages, Math.max(1, Number(e.target.value) || 1)),
                )
              }
              className="w-8 bg-transparent text-center outline-none tabular-nums"
              disabled={!pdfAvailable}
            />
            <span className="text-muted-foreground">/ {totalPages}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPdfPage(Math.min(totalPages, pdfPage + 1))}
            disabled={!pdfAvailable}
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
          {doc && pdfAvailable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => void handleDownload()}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
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
          <FilesView
            docName={doc.company}
            ticker={doc.ticker}
            iframeSrc={iframeSrc}
            zoom={zoom}
            loading={loadingInfo || loadingPdf}
            error={infoError ?? pdfError}
            pdfAvailable={pdfAvailable}
            indexed={indexed}
            chunkCount={info?.chunk_count ?? doc.chunksIndexed ?? 0}
          />
        )}
        {tab === "checklist" && (
          <ChecklistView indexed={indexed} pdfAvailable={pdfAvailable} />
        )}
        {tab === "form" && doc && <FormView doc={doc} indexed={indexed} />}
      </div>
    </div>
  );
}

function FilesView({
  docName,
  ticker,
  iframeSrc,
  zoom,
  loading,
  error,
  pdfAvailable,
  indexed,
  chunkCount,
}: {
  docName: string;
  ticker: string;
  iframeSrc: string | null;
  zoom: number;
  loading: boolean;
  error: string | null;
  pdfAvailable: boolean;
  indexed: boolean;
  chunkCount: number;
}) {
  if (loading) {
    return (
      <div className="grid h-full min-h-[320px] place-items-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Loading filing...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfAvailable) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-warning" />
        <h3 className="text-sm font-semibold">PDF not available</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {error ??
            `${docName} has not been uploaded to the backend yet. Upload this 10-K from the dashboard to view and query it.`}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={ticker}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full min-h-[480px] max-w-4xl flex-col overflow-hidden rounded-md bg-background shadow-2xl ring-1 ring-border"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-primary">
            {ticker}
          </span>
          <span className="text-muted-foreground">{docName}</span>
        </div>
        <span className="text-muted-foreground">
          {indexed ? `${chunkCount} chunks indexed` : "Not indexed"}
        </span>
      </div>
      {iframeSrc ? (
        <iframe
          title={`${docName} 10-K PDF`}
          src={iframeSrc}
          className="min-h-[520px] w-full flex-1 border-0 bg-white"
        />
      ) : (
        <div className="grid min-h-[520px] flex-1 place-items-center bg-muted/20 text-xs text-muted-foreground">
          Preparing PDF viewer...
        </div>
      )}
    </motion.div>
  );
}

function ChecklistView({
  indexed,
  pdfAvailable,
}: {
  indexed: boolean;
  pdfAvailable: boolean;
}) {
  const items = [
    { label: "PDF uploaded to backend", done: pdfAvailable },
    { label: "Pages extracted and chunked", done: indexed },
    { label: "Embeddings indexed in pgvector", done: indexed },
    { label: "Ready for agent queries", done: indexed && pdfAvailable },
    { label: "Assignment metrics available via chat", done: indexed },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <h3 className="mb-3 text-sm font-semibold">Indexing Checklist</h3>
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

function FormView({
  doc,
  indexed,
}: {
  doc: { company: string; ticker: string; fileName: string; uploadedAt: string };
  indexed: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="glow-card p-6">
        <h3 className="mb-1 text-sm font-semibold">Filing Metadata</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Loaded from backend storage
        </p>
        <div className="space-y-3">
          {[
            ["Filing Type", "10-K Annual Report"],
            ["Registrant", doc.company],
            ["Ticker", doc.ticker],
            ["Filename", doc.fileName],
            ["Uploaded", new Date(doc.uploadedAt).toLocaleString()],
            ["Indexed", indexed ? "Yes" : "No"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between border-b border-border/40 pb-2 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="max-w-[60%] truncate font-mono text-right text-xs sm:text-sm">
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

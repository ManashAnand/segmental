"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/lib/store";
import { uploadTenK } from "@/lib/api";
import type { UploadResult } from "@/lib/types";
import {
  slugFromFilename,
  tickerFromSlug,
  type UploadedDoc,
} from "@/lib/mock-data";

interface QueueItem {
  id: string;
  file: File;
  progress: number;
  done: boolean;
  error?: string;
  result?: UploadResult;
}

const MAX_FILES = 10;
const MAX_SIZE = 25 * 1024 * 1024;

export function UploadZone() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef<Set<string>>(new Set());
  const router = useRouter();
  const addDocuments = useAppStore((s) => s.addDocuments);

  const uploadFile = useCallback(async (item: QueueItem) => {
    if (uploadingRef.current.has(item.id)) return;
    uploadingRef.current.add(item.id);

    const interval = setInterval(() => {
      setQueue((q) => {
        const idx = q.findIndex((x) => x.id === item.id);
        if (idx === -1 || q[idx].done) return q;
        const current = q[idx];
        const next = Math.min(92, current.progress + 10 + Math.random() * 8);
        const updated = [...q];
        updated[idx] = { ...current, progress: next };
        return updated;
      });
    }, 180);

    try {
      const result = await uploadTenK(item.file, undefined, true);
      clearInterval(interval);
      setQueue((q) => {
        const idx = q.findIndex((x) => x.id === item.id);
        if (idx === -1) return q;
        const updated = [...q];
        updated[idx] = {
          ...updated[idx],
          progress: 100,
          done: true,
          result,
        };
        return updated;
      });
    } catch (err) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : "Upload failed";
      setQueue((q) => {
        const idx = q.findIndex((x) => x.id === item.id);
        if (idx === -1) return q;
        const updated = [...q];
        updated[idx] = {
          ...updated[idx],
          progress: 100,
          done: true,
          error: message,
        };
        return updated;
      });
    } finally {
      uploadingRef.current.delete(item.id);
    }
  }, []);

  useEffect(() => {
    for (const item of queue) {
      if (!item.done && item.progress === 0 && !item.error) {
        void uploadFile(item);
      }
    }
  }, [queue, uploadFile]);

  const onFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (arr.length === 0) {
      toast.error("Only PDF files are supported.");
      return;
    }

    setQueue((prev) => {
      const next = [...prev];
      for (const f of arr) {
        if (next.length >= MAX_FILES) break;
        if (f.size > MAX_SIZE) {
          toast.error(`${f.name} exceeds 25MB limit.`);
          continue;
        }
        next.push({
          id: crypto.randomUUID(),
          file: f,
          progress: 0,
          done: false,
        });
      }
      return next;
    });
  }, []);

  const remove = (id: string) => setQueue((q) => q.filter((x) => x.id !== id));

  const submit = () => {
    if (queue.length === 0) return;
    if (!queue.every((q) => q.done)) {
      toast.info("Wait for uploads to finish.");
      return;
    }

    const successful = queue.filter((q) => q.result && !q.error);
    if (successful.length === 0) {
      toast.error("All uploads failed. Is the API running on localhost:8000?");
      return;
    }

    setSubmitting(true);
    const docs: UploadedDoc[] = successful.map((q) => {
      const result = q.result!;
      const slug = result.company || slugFromFilename(q.file.name);
      return {
        id: `doc-${crypto.randomUUID().slice(0, 8)}`,
        company: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        ticker: tickerFromSlug(slug),
        companySlug: slug,
        fileName: result.filename || q.file.name,
        size: q.file.size,
        uploadedAt: new Date().toISOString(),
        status: "processed",
        fieldsExtracted: 120 + Math.floor(Math.random() * 80),
        confidence: 0.88 + Math.random() * 0.1,
        accuracy: 0.9 + Math.random() * 0.08,
        chunksIndexed: result.chunks_indexed,
      };
    });

    addDocuments(docs);
    toast.success(`${docs.length} report${docs.length > 1 ? "s" : ""} uploaded.`);
    setQueue([]);
    setSubmitting(false);
    setTimeout(() => router.push("/agent"), 400);
  };

  return (
    <div className="space-y-4">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFiles(e.dataTransfer.files);
        }}
        animate={{ scale: dragOver ? 1.01 : 1 }}
        className={`glow-card group relative cursor-pointer p-8 transition-colors sm:p-10 ${
          dragOver ? "border-primary" : ""
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-xl shadow-primary/30">
              <UploadCloud className="h-7 w-7" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold sm:text-xl">
              Drop your 10-K reports here
            </h3>
            <p className="text-sm text-muted-foreground">
              PDF only · Up to 10 files · Max 25MB each
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse files
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glow-card divide-y divide-border/60 p-2"
          >
            {queue.map((q) => (
              <div key={q.id} className="flex items-center gap-3 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{q.file.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {(q.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={q.progress} className="h-1.5 flex-1" />
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {Math.round(q.progress)}%
                    </span>
                    {q.error ? (
                      <span className="text-xs text-destructive">Failed</span>
                    ) : q.done ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(q.id);
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                {queue.filter((q) => q.done && !q.error).length}/{queue.length}{" "}
                uploaded
              </span>
              <Button
                onClick={submit}
                disabled={!queue.every((q) => q.done) || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Process & open agent"
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

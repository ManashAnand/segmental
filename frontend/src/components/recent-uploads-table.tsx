"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Download, MessageSquare, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

export function RecentUploadsTable() {
  const docs = useAppStore((s) => s.documents);
  const recentlyAdded = useAppStore((s) => s.recentlyAddedIds);
  const clearRecentlyAdded = useAppStore((s) => s.clearRecentlyAdded);
  const select = useAppStore((s) => s.selectDocument);
  const router = useRouter();

  useEffect(() => {
    if (recentlyAdded.length === 0) return;
    const t = setTimeout(clearRecentlyAdded, 4000);
    return () => clearTimeout(t);
  }, [recentlyAdded, clearRecentlyAdded]);

  return (
    <div className="glow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="font-semibold">Recent Uploads</h3>
          <p className="text-xs text-muted-foreground">
            Track your processed filings · stored locally
          </p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          {docs.length} total
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Uploaded</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Chunks</th>
              <th className="px-5 py-3 font-medium">Fields</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {docs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    No uploads yet — drop a 10-K PDF above to get started.
                  </td>
                </tr>
              ) : (
                docs.map((d, index) => {
                  const isNew = recentlyAdded.includes(d.id);
                  return (
                    <motion.tr
                      key={d.id}
                      layout
                      initial={isNew ? { opacity: 0, y: -12, scale: 0.98 } : false}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        backgroundColor: isNew
                          ? "rgba(139, 92, 246, 0.08)"
                          : "rgba(0,0,0,0)",
                      }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                        delay: isNew ? 0 : index * 0.02,
                      }}
                      className="border-b border-border/40 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={
                              isNew
                                ? { scale: [1, 1.08, 1], rotate: [0, -4, 0] }
                                : {}
                            }
                            transition={{ duration: 0.5 }}
                            className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-chart-2/20 text-[11px] font-semibold ${
                              isNew ? "ring-2 ring-primary/40" : ""
                            }`}
                          >
                            {d.ticker.slice(0, 2)}
                          </motion.div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{d.company}</span>
                              {isNew && (
                                <Badge className="h-5 border-chart-3/40 bg-chart-3/15 px-1.5 text-[10px] text-chart-3">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {d.fileName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDistanceToNow(new Date(d.uploadedAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={
                            d.status === "processed"
                              ? "border-success/40 bg-success/10 text-success"
                              : d.status === "processing"
                                ? "border-warning/40 bg-warning/10 text-warning"
                                : "border-border bg-muted text-muted-foreground"
                          }
                        >
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        {d.chunksIndexed ?? "—"}
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        {d.fieldsExtracted || "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              select(d.id);
                              router.push("/agent");
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

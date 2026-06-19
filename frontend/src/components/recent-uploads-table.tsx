"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Download, MessageSquare, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

export function RecentUploadsTable() {
  const docs = useAppStore((s) => s.documents);
  const select = useAppStore((s) => s.selectDocument);
  const router = useRouter();

  return (
    <div className="glow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="font-semibold">Recent Uploads</h3>
          <p className="text-xs text-muted-foreground">
            Track your processed filings
          </p>
        </div>
        <Button variant="ghost" size="sm">
          View all
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Uploaded</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Accuracy</th>
              <th className="px-5 py-3 font-medium">Fields</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
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
              docs.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-border/40 transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-chart-2/20 text-[11px] font-semibold">
                        {d.ticker.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{d.company}</div>
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
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-chart-3 to-chart-1"
                          style={{ width: `${d.accuracy * 100}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs">
                        {(d.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

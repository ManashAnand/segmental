"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { ChatPanel } from "@/components/agent/chat-panel";
import { DocumentSidebar } from "@/components/agent/document-sidebar";
import { InsightsPanel } from "@/components/agent/insights-panel";
import { PdfViewer } from "@/components/agent/pdf-viewer";
import { useAppStore } from "@/lib/store";

export function AgentWorkspace() {
  const docs = useAppStore((s) => s.documents);
  const selectedDocId = useAppStore((s) => s.selectedDocId);
  const selectDocument = useAppStore((s) => s.selectDocument);

  useEffect(() => {
    if (!selectedDocId && docs[0]) {
      selectDocument(docs[0].id);
    }
  }, [selectedDocId, docs, selectDocument]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <div className="hidden h-full w-56 shrink-0 xl:block xl:w-60">
          <DocumentSidebar />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-[42vh] min-w-0 flex-1 border-b border-border/60 lg:min-h-0 lg:border-b-0 lg:border-r">
            <PdfViewer />
          </div>
          <div className="flex h-[58vh] w-full shrink-0 flex-col lg:h-auto lg:w-[min(100%,480px)] xl:w-[440px] 2xl:w-[480px]">
            <ChatPanel />
          </div>
        </div>

        <div className="hidden h-full w-72 shrink-0 2xl:block 2xl:w-80">
          <InsightsPanel />
        </div>
      </div>
    </div>
  );
}

export function AgentPageShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader />
      <AgentWorkspace />
    </div>
  );
}

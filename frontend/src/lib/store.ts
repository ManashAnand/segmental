import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_DOCUMENTS, type UploadedDoc } from "./mock-data";
import type { CompanyInfo, LiveMetric } from "./types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  tool?: {
    retrievedPages: { doc: string; page: number; snippet: string }[];
    extractedValues: { label: string; value: string }[];
    reasoning: string[];
    confidence: number;
  };
}

interface AppState {
  documents: UploadedDoc[];
  selectedDocId: string | null;
  recentlyAddedIds: string[];
  messages: ChatMessage[];
  isStreaming: boolean;
  pdfPage: number;
  pdfTargetPage: number | null;
  companyInfoBySlug: Record<string, CompanyInfo>;
  liveMetricsBySlug: Record<string, LiveMetric[]>;
  queryCountByDocId: Record<string, number>;
  lastQueryLabelByDocId: Record<string, string>;
  llmProvider: string;
  addDocuments: (docs: UploadedDoc[]) => string[];
  removeDocument: (id: string) => void;
  selectDocument: (id: string | null) => void;
  resetDocuments: () => void;
  clearRecentlyAdded: () => void;
  addMessage: (message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  appendToLast: (text: string) => void;
  attachToolToLast: (tool: NonNullable<ChatMessage["tool"]>) => void;
  clearMessages: () => void;
  setPdfPage: (page: number) => void;
  jumpToPdfPage: (page: number) => void;
  clearPdfTargetPage: () => void;
  setCompanyInfo: (slug: string, info: CompanyInfo) => void;
  recordQueryResult: (
    docId: string,
    slug: string,
    metric: LiveMetric,
    confidence: number,
  ) => void;
  setLlmProvider: (provider: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      documents: SEED_DOCUMENTS,
      selectedDocId: SEED_DOCUMENTS[0]?.id ?? null,
      recentlyAddedIds: [],
      messages: [],
      isStreaming: false,
      pdfPage: 1,
      pdfTargetPage: null,
      companyInfoBySlug: {},
      liveMetricsBySlug: {},
      queryCountByDocId: {},
      lastQueryLabelByDocId: {},
      llmProvider: "Groq",
      addDocuments: (docs) => {
        const ids = docs.map((d) => d.id);
        set((state) => ({
          documents: [...docs, ...state.documents],
          selectedDocId: docs[0]?.id ?? state.selectedDocId,
          recentlyAddedIds: ids,
        }));
        return ids;
      },
      removeDocument: (id) =>
        set((state) => {
          const documents = state.documents.filter((d) => d.id !== id);
          return {
            documents,
            selectedDocId:
              state.selectedDocId === id
                ? (documents[0]?.id ?? null)
                : state.selectedDocId,
            recentlyAddedIds: state.recentlyAddedIds.filter((x) => x !== id),
          };
        }),
      selectDocument: (id) => set({ selectedDocId: id, pdfPage: 1 }),
      clearRecentlyAdded: () => set({ recentlyAddedIds: [] }),
      resetDocuments: () =>
        set({
          documents: SEED_DOCUMENTS,
          selectedDocId: SEED_DOCUMENTS[0]?.id ?? null,
          recentlyAddedIds: [],
        }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      appendToLast: (text) =>
        set((state) => {
          const messages = [...state.messages];
          const last = messages[messages.length - 1];
          if (!last || last.role !== "assistant") return state;
          messages[messages.length - 1] = {
            ...last,
            content: last.content + text,
          };
          return { messages };
        }),
      attachToolToLast: (tool) =>
        set((state) => {
          const messages = [...state.messages];
          const last = messages[messages.length - 1];
          if (!last || last.role !== "assistant") return state;
          messages[messages.length - 1] = { ...last, tool };
          return { messages };
        }),
      clearMessages: () => set({ messages: [] }),
      setPdfPage: (pdfPage) => set({ pdfPage }),
      jumpToPdfPage: (page) =>
        set({ pdfPage: page, pdfTargetPage: page }),
      clearPdfTargetPage: () => set({ pdfTargetPage: null }),
      setCompanyInfo: (slug, info) =>
        set((state) => ({
          companyInfoBySlug: { ...state.companyInfoBySlug, [slug]: info },
        })),
      recordQueryResult: (docId, slug, metric, confidence) =>
        set((state) => {
          const existing = state.liveMetricsBySlug[slug] ?? [];
          const deduped = existing.filter((m) => m.label !== metric.label);
          const liveMetricsBySlug = {
            ...state.liveMetricsBySlug,
            [slug]: [metric, ...deduped].slice(0, 12),
          };
          const queryCountByDocId = {
            ...state.queryCountByDocId,
            [docId]: (state.queryCountByDocId[docId] ?? 0) + 1,
          };
          const lastQueryLabelByDocId = {
            ...state.lastQueryLabelByDocId,
            [docId]: metric.label,
          };
          const documents = state.documents.map((doc) =>
            doc.id === docId
              ? {
                  ...doc,
                  fieldsExtracted: liveMetricsBySlug[slug].length,
                  confidence,
                }
              : doc,
          );
          return {
            documents,
            liveMetricsBySlug,
            queryCountByDocId,
            lastQueryLabelByDocId,
          };
        }),
      setLlmProvider: (llmProvider) => set({ llmProvider }),
    }),
    {
      name: "segmental.app",
      partialize: (state) => ({
        documents: state.documents,
        selectedDocId: state.selectedDocId,
      }),
    },
  ),
);

export function useDocumentStats() {
  const docs = useAppStore((s) => s.documents);
  const processed = docs.filter((d) => d.status === "processed");
  const totalFields = processed.reduce((s, d) => s + d.fieldsExtracted, 0);
  const avgAccuracy = processed.length
    ? Math.round(
        (processed.reduce((sum, d) => sum + d.accuracy, 0) / processed.length) *
          1000,
      ) / 10
    : 0;
  const companies = new Set(docs.map((d) => d.companySlug ?? d.company)).size;

  return {
    totalReports: docs.length,
    processedCount: processed.length,
    totalFields,
    avgAccuracy,
    companies,
  };
}

export function useSelectedDocument() {
  const docs = useAppStore((s) => s.documents);
  const selectedDocId = useAppStore((s) => s.selectedDocId);
  return docs.find((d) => d.id === selectedDocId) ?? docs[0] ?? null;
}

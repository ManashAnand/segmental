import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_DOCUMENTS, type UploadedDoc } from "./mock-data";

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
  messages: ChatMessage[];
  isStreaming: boolean;
  addDocuments: (docs: UploadedDoc[]) => void;
  removeDocument: (id: string) => void;
  selectDocument: (id: string | null) => void;
  resetDocuments: () => void;
  addMessage: (message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  appendToLast: (text: string) => void;
  attachToolToLast: (tool: NonNullable<ChatMessage["tool"]>) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      documents: SEED_DOCUMENTS,
      selectedDocId: SEED_DOCUMENTS[0]?.id ?? null,
      messages: [],
      isStreaming: false,
      addDocuments: (docs) =>
        set((state) => ({
          documents: [...docs, ...state.documents],
          selectedDocId: state.selectedDocId ?? docs[0]?.id ?? null,
        })),
      removeDocument: (id) =>
        set((state) => {
          const documents = state.documents.filter((d) => d.id !== id);
          return {
            documents,
            selectedDocId:
              state.selectedDocId === id
                ? (documents[0]?.id ?? null)
                : state.selectedDocId,
          };
        }),
      selectDocument: (id) => set({ selectedDocId: id }),
      resetDocuments: () =>
        set({
          documents: SEED_DOCUMENTS,
          selectedDocId: SEED_DOCUMENTS[0]?.id ?? null,
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

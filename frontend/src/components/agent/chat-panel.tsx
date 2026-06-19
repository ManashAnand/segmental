"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Sparkles,
  User,
  Bot,
  ChevronDown,
  FileText,
  ListChecks,
  Brain,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { queryFiling } from "@/lib/api";
import {
  useAppStore,
  useSelectedDocument,
  type ChatMessage,
} from "@/lib/store";
import type { V2QueryResponse } from "@/lib/types";

function formatAnswerMarkdown(response: V2QueryResponse): string {
  const { answer } = response;
  if (answer.value != null && answer.label) {
    const unit = answer.unit ? ` ${answer.unit}` : "";
    const year = answer.fiscal_year ? ` · ${answer.fiscal_year}` : "";
    return (
      `### ${answer.label}\n\n` +
      `**${answer.value.toLocaleString()}**${unit}${year}\n\n` +
      answer.answer
    );
  }
  return answer.answer;
}

function buildToolFromResponse(
  response: V2QueryResponse,
  ticker: string,
): NonNullable<ChatMessage["tool"]> {
  const { answer } = response;
  const retrievedPages =
    answer.retrieved_chunks?.map((chunk) => ({
      doc: ticker,
      page: chunk.page_number,
      snippet: chunk.snippet,
    })) ?? [];

  if (retrievedPages.length === 0 && answer.source_text) {
    retrievedPages.push({
      doc: ticker,
      page: 1,
      snippet: answer.source_text.slice(0, 240),
    });
  }

  const extractedValues: { label: string; value: string }[] = [];
  if (answer.label && answer.value != null) {
    extractedValues.push({
      label: answer.label,
      value: `${answer.value.toLocaleString()}${answer.unit ? ` ${answer.unit}` : ""}`,
    });
  }

  const scores = answer.retrieval_scores ?? [];
  const confidence = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0.55;

  return {
    retrievedPages,
    extractedValues,
    reasoning: [
      `Matched question to ${response.company} filing corpus.`,
      `Retrieved ${answer.chunks_used ?? retrievedPages.length} relevant passages via semantic search.`,
      answer.source_text
        ? "Extracted value from cited source text in the 10-K."
        : "Synthesized answer from retrieved filing context.",
      "Formatted response with fiscal year and units where available.",
    ],
    confidence: Math.min(0.99, Math.max(0.35, confidence)),
  };
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const doc = useSelectedDocument();
  const {
    messages,
    addMessage,
    isStreaming,
    setStreaming,
    appendToLast,
    attachToolToLast,
    recordQueryResult,
    jumpToPdfPage,
    setLlmProvider,
    llmProvider,
  } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = useMemo(
    () =>
      doc
        ? [
            `What was total revenue for ${doc.company}?`,
            `What was R&D expense for ${doc.company}?`,
            `What are the geographic revenue segments for ${doc.company}?`,
            `What was net income for ${doc.company}?`,
          ]
        : [
            "What was total revenue?",
            "What was R&D expense?",
            "What are geographic revenue segments?",
            "What was net income?",
          ],
    [doc],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    if (!doc?.companySlug) {
      return;
    }

    setInput("");
    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    });

    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    });
    setStreaming(true);

    try {
      const response = await queryFiling(doc.companySlug, content);
      setLlmProvider(response.llm_provider);

      const full = formatAnswerMarkdown(response);
      const tokens = full.split(/(\s+)/);
      for (const token of tokens) {
        await new Promise((r) => setTimeout(r, 12));
        appendToLast(token);
      }

      const tool = buildToolFromResponse(response, doc.ticker);
      attachToolToLast(tool);

      const { answer } = response;
      if (answer.label || answer.value != null) {
        recordQueryResult(
          doc.id,
          doc.companySlug,
          {
            id: crypto.randomUUID(),
            label: answer.label ?? "Extracted value",
            value: answer.value ?? null,
            unit: answer.unit,
            fiscalYear: answer.fiscal_year,
            sourceText: answer.source_text,
            question: content,
            queriedAt: new Date().toISOString(),
            confidence: tool.confidence,
          },
          tool.confidence,
        );
      }

      const targetPage = tool.retrievedPages[0]?.page;
      if (targetPage && targetPage > 0) {
        jumpToPdfPage(targetPage);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Query failed unexpectedly.";
      appendToLast(
        `### Unable to answer\n\n${message}\n\nUpload and index this filing from the dashboard first.`,
      );
      attachToolToLast({
        retrievedPages: [],
        extractedValues: [],
        reasoning: [
          "Attempted to query the backend RAG pipeline.",
          message.includes("No embedded chunks")
            ? "No indexed chunks found for this company."
            : "The request failed before retrieval completed.",
        ],
        confidence: 0,
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              Financial Agent
            </h2>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {llmProvider} · {doc?.company ?? "Select a document"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          Online
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center pt-8 text-center sm:pt-12">
            <div className="relative mb-5">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/30 blur-2xl" />
              <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-lg shadow-primary/30">
                <Brain className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ask questions about the uploaded 10-K reports.
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              I&apos;ll surface extracted metrics, cite source pages, and explain
              my reasoning step by step.
            </p>
            <div className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestedPrompts.map((p) => (
                <motion.button
                  key={p}
                  whileHover={{ y: -2 }}
                  onClick={() => void send(p)}
                  className="group rounded-xl border border-border/80 bg-card/40 p-4 text-left text-sm transition-colors hover:border-primary/40 hover:bg-card"
                >
                  <Sparkles className="mb-2 h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground/90 group-hover:text-foreground">
                    {p}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </AnimatePresence>
            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                </div>
                Querying filing...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 bg-background/60 p-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <div className="glow-card flex items-end gap-2 p-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask about revenue, segments, R&D, risks..."
              className="min-h-[44px] max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              onClick={() => void send()}
              disabled={!input.trim() || isStreaming || !doc}
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Answers come from indexed 10-K chunks — verify against the source PDF.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const jumpToPdfPage = useAppStore((s) => s.jumpToPdfPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          isUser
            ? "bg-muted text-foreground"
            : "bg-gradient-to-br from-primary to-chart-2 text-primary-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`min-w-0 flex-1 space-y-2 ${isUser ? "flex flex-col items-end" : ""}`}
      >
        <div
          className={`max-w-full rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-foreground"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="agent-markdown max-w-none text-sm">
              <ReactMarkdown>{message.content || "​"}</ReactMarkdown>
            </div>
          )}
        </div>
        {message.tool && (
          <ToolOutput
            tool={message.tool}
            onPageClick={(page) => jumpToPdfPage(page)}
          />
        )}
      </div>
    </motion.div>
  );
}

function ToolOutput({
  tool,
  onPageClick,
}: {
  tool: NonNullable<ChatMessage["tool"]>;
  onPageClick: (page: number) => void;
}) {
  return (
    <div className="w-full space-y-2 rounded-xl border border-border/70 bg-card/40 p-2 backdrop-blur">
      <Section
        icon={FileText}
        label="Retrieved Pages"
        badge={`${tool.retrievedPages.length}`}
      >
        {tool.retrievedPages.length === 0 ? (
          <p className="text-xs text-muted-foreground">No passages retrieved.</p>
        ) : (
          <ul className="space-y-2">
            {tool.retrievedPages.map((p, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onPageClick(p.page)}
                  className="w-full rounded-md border border-border/60 bg-background/40 p-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-background/70"
                >
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {p.doc}
                    </span>
                    <span className="text-muted-foreground">p. {p.page}</span>
                  </div>
                  <p className="text-muted-foreground">
                    &ldquo;{p.snippet}&rdquo;
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {tool.extractedValues.length > 0 && (
        <Section
          icon={ListChecks}
          label="Extracted Values"
          badge={`${tool.extractedValues.length}`}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {tool.extractedValues.map((v, i) => (
              <div key={i} className="rounded-md bg-muted/40 px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {v.label}
                </div>
                <div className="font-mono text-xs">{v.value}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section icon={Brain} label="Reasoning Chain">
        <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
          {tool.reasoning.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </Section>
      <Section icon={Gauge} label="Confidence">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-chart-3 to-chart-1"
              style={{ width: `${tool.confidence * 100}%` }}
            />
          </div>
          <span className="font-mono text-xs tabular-nums">
            {(tool.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  label,
  badge,
  children,
}: {
  icon: LucideIcon;
  label: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/50">
        <span className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{label}</span>
          {badge && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

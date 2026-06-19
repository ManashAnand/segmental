export type ProjectStatus = "processing" | "completed" | "failed";

export interface Project {
  id: string;
  company: string;
  filename: string;
  status: ProjectStatus;
  chunksIndexed: number;
  createdAt: string;
  error?: string;
}

export interface UploadResult {
  company: string;
  filename: string;
  chunks_indexed: number;
  message: string;
}

export interface RetrievedChunkSummary {
  page_number: number;
  score: number;
  snippet: string;
}

export interface QueryAnswer {
  answer: string;
  label?: string | null;
  value?: number | null;
  unit?: string | null;
  fiscal_year?: string | null;
  source_text?: string | null;
  retrieval_scores?: number[];
  chunks_used?: number;
  retrieved_chunks?: RetrievedChunkSummary[];
}

export interface V2QueryResponse {
  company: string;
  question: string;
  llm_provider: string;
  answer: QueryAnswer;
}

export interface CompanyInfo {
  company: string;
  pdf_available: boolean;
  indexed: boolean;
  page_count: number;
  chunk_count: number;
  filename?: string | null;
}

export interface LiveMetric {
  id: string;
  label: string;
  value: number | null;
  unit?: string | null;
  fiscalYear?: string | null;
  sourceText?: string | null;
  question: string;
  queriedAt: string;
  confidence: number;
}

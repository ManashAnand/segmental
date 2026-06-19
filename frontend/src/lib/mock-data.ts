export type DocStatus = "processed" | "processing" | "failed";

export interface UploadedDoc {
  id: string;
  company: string;
  ticker: string;
  companySlug: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  status: DocStatus;
  fieldsExtracted: number;
  confidence: number;
  accuracy: number;
  chunksIndexed?: number;
}

export const SEED_DOCUMENTS: UploadedDoc[] = [
  {
    id: "doc-aapl",
    company: "Apple Inc.",
    ticker: "AAPL",
    companySlug: "apple",
    fileName: "aapl-10k-2024.pdf",
    size: 4_200_000,
    uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: "processed",
    fieldsExtracted: 184,
    confidence: 0.94,
    accuracy: 0.97,
    chunksIndexed: 142,
  },
  {
    id: "doc-meta",
    company: "Meta Platforms",
    ticker: "META",
    companySlug: "meta",
    fileName: "meta-10k-2024.pdf",
    size: 3_800_000,
    uploadedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: "processed",
    fieldsExtracted: 176,
    confidence: 0.91,
    accuracy: 0.942,
    chunksIndexed: 128,
  },
  {
    id: "doc-nvda",
    company: "NVIDIA Corp.",
    ticker: "NVDA",
    companySlug: "nvidia",
    fileName: "nvda-10k-2024.pdf",
    size: 2_900_000,
    uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "processed",
    fieldsExtracted: 192,
    confidence: 0.96,
    accuracy: 0.981,
    chunksIndexed: 156,
  },
  {
    id: "doc-crm",
    company: "Salesforce Inc.",
    ticker: "CRM",
    companySlug: "salesforce",
    fileName: "crm-10k-2024.pdf",
    size: 3_100_000,
    uploadedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    status: "processed",
    fieldsExtracted: 168,
    confidence: 0.89,
    accuracy: 0.928,
    chunksIndexed: 118,
  },
  {
    id: "doc-tsla",
    company: "Tesla Inc.",
    ticker: "TSLA",
    companySlug: "tesla",
    fileName: "tsla-10k-2024.pdf",
    size: 5_400_000,
    uploadedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    status: "processing",
    fieldsExtracted: 0,
    confidence: 0,
    accuracy: 0,
    chunksIndexed: 0,
  },
];

export function slugFromFilename(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 32);
}

export function tickerFromSlug(slug: string): string {
  const cleaned = slug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return cleaned.slice(0, 4) || "DOC";
}

export interface DocMetrics {
  company: string;
  ticker: string;
  totalRevenue: number;
  rdExpense: number;
  geo: { region: string; value: number }[];
  segments: { segment: string; value: number }[];
}

export const mockMetrics: Record<string, DocMetrics> = {
  "doc-aapl": {
    company: "Apple Inc.",
    ticker: "AAPL",
    totalRevenue: 383_290,
    rdExpense: 31_370,
    geo: [
      { region: "Americas", value: 162_560 },
      { region: "Europe", value: 94_930 },
      { region: "Greater China", value: 66_952 },
      { region: "Japan", value: 25_052 },
      { region: "Rest of Asia Pacific", value: 33_796 },
    ],
    segments: [
      { segment: "iPhone", value: 200_583 },
      { segment: "Services", value: 85_200 },
      { segment: "Mac", value: 29_984 },
      { segment: "iPad", value: 28_300 },
      { segment: "Wearables", value: 39_845 },
    ],
  },
  "doc-meta": {
    company: "Meta Platforms",
    ticker: "META",
    totalRevenue: 134_902,
    rdExpense: 38_483,
    geo: [
      { region: "United States", value: 63_400 },
      { region: "Europe", value: 32_100 },
      { region: "Asia-Pacific", value: 24_800 },
      { region: "Rest of World", value: 14_602 },
    ],
    segments: [
      { segment: "Family of Apps", value: 133_006 },
      { segment: "Reality Labs", value: 1_896 },
    ],
  },
  "doc-nvda": {
    company: "NVIDIA Corp.",
    ticker: "NVDA",
    totalRevenue: 60_922,
    rdExpense: 8_675,
    geo: [
      { region: "United States", value: 26_966 },
      { region: "Taiwan", value: 14_200 },
      { region: "China", value: 10_800 },
      { region: "Other", value: 8_956 },
    ],
    segments: [
      { segment: "Data Center", value: 47_525 },
      { segment: "Gaming", value: 10_447 },
      { segment: "Professional Visualization", value: 1_553 },
      { segment: "Automotive", value: 1_091 },
    ],
  },
  "doc-crm": {
    company: "Salesforce Inc.",
    ticker: "CRM",
    totalRevenue: 34_857,
    rdExpense: 4_906,
    geo: [
      { region: "Americas", value: 23_289 },
      { region: "Europe", value: 8_128 },
      { region: "Asia Pacific", value: 3_440 },
    ],
    segments: [
      { segment: "Subscription & Support", value: 32_537 },
      { segment: "Professional Services", value: 2_320 },
    ],
  },
  "doc-tsla": {
    company: "Tesla Inc.",
    ticker: "TSLA",
    totalRevenue: 96_773,
    rdExpense: 4_540,
    geo: [
      { region: "United States", value: 45_200 },
      { region: "China", value: 21_750 },
      { region: "Other International", value: 29_823 },
    ],
    segments: [
      { segment: "Automotive", value: 82_419 },
      { segment: "Energy Generation & Storage", value: 6_035 },
      { segment: "Services & Other", value: 8_319 },
    ],
  },
};

export function metricsForDoc(docId: string): DocMetrics | null {
  return mockMetrics[docId] ?? null;
}

export const suggestedPrompts = [
  "What is Apple's geographic revenue?",
  "Compare R&D spend across companies.",
  "Which company has the largest segment revenue?",
  "Show all extracted metrics for Meta.",
];

export const accuracyTrend = [
  { period: "Jan", v1: 72, v2: 88 },
  { period: "Feb", v1: 74, v2: 91 },
  { period: "Mar", v1: 76, v2: 93 },
  { period: "Apr", v1: 78, v2: 95 },
  { period: "May", v1: 80, v2: 96 },
  { period: "Jun", v1: 82, v2: 98 },
];

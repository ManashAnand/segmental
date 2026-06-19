import type { UploadResult } from "./types";
import type { UploadedDoc } from "./mock-data";
import { slugFromFilename, tickerFromSlug } from "./mock-data";

export function formatCompanyName(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function uploadResultToDoc(result: UploadResult, file: File): UploadedDoc {
  const slug = result.company || slugFromFilename(file.name);
  return {
    id: `doc-${crypto.randomUUID().slice(0, 8)}`,
    company: formatCompanyName(slug),
    ticker: tickerFromSlug(slug),
    companySlug: slug,
    fileName: result.filename || file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: "processed",
    fieldsExtracted: result.chunks_indexed,
    confidence: 0.95,
    accuracy: 1,
    chunksIndexed: result.chunks_indexed,
  };
}

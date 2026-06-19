import type {
  CompanyInfo,
  UploadResult,
  V2QueryResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

async function parseError(response: Response, fallback: string): Promise<string> {
  let detail = `${fallback} (${response.status})`;
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { detail?: string | { msg?: string }[] };
    if (typeof body.detail === "string") detail = body.detail;
    else if (Array.isArray(body.detail))
      detail = body.detail.map((d) => d.msg).filter(Boolean).join(", ");
  } catch {
    if (text) detail = text.slice(0, 200);
  }
  return detail;
}

export async function uploadTenK(
  file: File,
  company?: string,
  overwrite = false,
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (company) form.append("company", company);
  form.append("overwrite", String(overwrite));

  const response = await fetch(`${API_BASE}/api/v2/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Upload failed"));
  }

  return response.json();
}

export function companyPdfUrl(companySlug: string): string {
  return `${API_BASE}/api/v2/companies/${encodeURIComponent(companySlug)}/pdf`;
}

export async function fetchCompanyPdfBlob(companySlug: string): Promise<Blob> {
  const response = await fetch(companyPdfUrl(companySlug));
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load PDF"));
  }
  return response.blob();
}

export async function getCompanyInfo(companySlug: string): Promise<CompanyInfo> {
  const response = await fetch(
    `${API_BASE}/api/v2/companies/${encodeURIComponent(companySlug)}/info`,
  );
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load company info"));
  }
  return response.json();
}

export async function queryFiling(
  company: string,
  question: string,
): Promise<V2QueryResponse> {
  const response = await fetch(`${API_BASE}/api/v2/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company, question }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "Query failed"));
  }
  return response.json();
}

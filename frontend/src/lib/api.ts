import type { UploadResult } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

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
    const detail = await response.text();
    throw new Error(detail || `Upload failed (${response.status})`);
  }

  return response.json();
}

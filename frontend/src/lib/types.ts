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

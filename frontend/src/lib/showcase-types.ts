export interface ShowcaseValue {
  label: string;
  value: number;
  unit: string;
  fiscal_year?: string;
  source_hint?: string;
  answer?: string;
  source_text?: string;
}

export interface ShowcaseResult {
  id: string;
  category: string;
  assignment_field: string | null;
  question: string;
  v1_supported?: boolean;
  expected: ShowcaseValue;
  actual: ShowcaseValue | null;
  match: boolean;
  relative_error: number | null;
  note?: string;
}

export interface ShowcaseReport {
  title: string;
  subtitle: string;
  pipeline_version: string;
  company_name: string;
  fiscal_year: string;
  summary: {
    total_questions: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    accuracy_percent: string;
    assignment_fields_tested?: number;
    assignment_fields_correct?: number;
  };
  results: ShowcaseResult[];
}

export async function loadShowcase(path: string): Promise<ShowcaseReport> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

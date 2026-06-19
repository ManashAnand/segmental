# 10-K Financial Report Extraction & Evaluation

A local pipeline that extracts financial metrics from SEC 10-K PDFs, evaluates accuracy against ground truth, and documents where the approach breaks down. Built as a Forward Deployed Engineer–style interview project.

## Goal

Extract three challenging but consistently available fields from 10-K reports:

| Field | Examples |
|-------|----------|
| **Geographic revenue** | Americas, North America, International |
| **Segment revenue** | AWS, Digital Media, iPhone, Data Center |
| **R&D expense** | Research and development, Technology and development |

Demonstrate: extraction → evaluation → error analysis → iterative improvement (V1 vs V2).

## Constraints

- **No** OCR APIs, Unstructured.io paid APIs, or external document services
- **Only** local processing: FastAPI, pdfplumber, pandas, regex, filesystem

---

## What we built

### Backend (`backend/`)

FastAPI service with clean architecture:

```
PDF upload → page text (pdfplumber) → keyword retrieval → regex/table parsing → JSON results
                                                                              ↓
                                                                    evaluate vs ground truth
```

| Component | Purpose |
|-----------|---------|
| `POST /upload` | Save PDF to `data/pdfs/`, auto-run extraction |
| `POST /extract` | Re-run extraction for stored PDFs |
| `POST /evaluate` | Compare results vs `ground_truth.csv` |
| `GET /results`, `/metrics`, `/errors` | Read stored outputs |

**Services:** `pdf_extraction`, `retrieval`, `extraction`, `evaluation`, `error_analysis` (skeleton)

**Scripts:**
- `scripts/batch_extract_v1.py` — batch all PDFs → `data/extracted/v1/{company}_results.json`
- `scripts/build_accuracy_report.py` — compare extraction vs values read from PDFs → `accuracy_report.json`

### Frontend (`frontend/`)

Next.js boilerplate (not yet wired to the API).

### Data layout

```
data/                          # Source PDFs (local, not in git)
backend/app/data/
  pdfs/                        # Uploaded PDFs
  cache/                       # Cached page text (JSON)
  extracted/
    results.json               # Latest merged API results
    v1/                        # Per-company V1 extraction output
      adobe_results.json
      all_results.json
      accuracy_report.json
  ground_truth/
    ground_truth.csv           # Manual answer key (Adobe complete)
```

---

## V1 pipeline (how it works)

1. **Extract pages** — pdfplumber reads every page; text cached as JSON.
2. **Retrieve pages** — score each page by keyword families (geography / segment / R&D); take top 5 per field.
3. **Parse values** — on those pages only:
   - Regex numbers from relevant text lines
   - pdfplumber table cells
4. **Filter noise (V1.1)** — drop years (2018–2030), percentage rows, small integers without thousands commas.
5. **Store** — all candidates in JSON (`text_hits`, `table_hits` per page).

We do **not** regex the entire document — only retrieved pages.

---

## Results

### Overall accuracy (9 companies, 25 fields, 1% tolerance)

Source: `backend/app/data/extracted/v1/accuracy_report.json`

| Metric | Score | Meaning |
|--------|-------|---------|
| **First-pick accuracy** | **16%** (4/25) | First number in our candidate list matches PDF truth |
| **Any-match accuracy** | **64%** (16/25) | Correct value appears *somewhere* in candidates |

### Per company (first pick / any match)

| Company | First pick | Any match | Notes |
|---------|------------|-----------|-------|
| Adobe | 1/3 | 3/3 | R&D perfect; geo/segment wrong first pick |
| Amazon | 0/2 | 2/2 | R&D not disclosed as standalone line |
| Apple | 0/3 | 3/3 | Quarterly doc; right nums in list |
| Meta | 1/3 | 2/3 | Segment perfect; geo missed |
| Nvidia | 1/3 | 1/3 | Data Center segment close |
| Oracle | 0/3 | 3/3 | Right nums in list |
| Salesforce | 1/3 | 1/3 | Americas geo perfect |
| Netflix | 0/2 | 1/2 | Values in thousands; geo N/A in text |
| AMD | 0/3 | 0/3 | Worst — wrong pages/numbers |

### What works well

- **Page retrieval** — keyword scoring usually lands on Item 7 / Notes tables (e.g. Adobe p43 Americas, p45 R&D).
- **R&D** — often a single clear income-statement line → best field overall.
- **Candidate collection** — 64% any-match shows the right number is often *on the page we found*.

### What fails

- **Picking one answer** — we collect many numbers per page (`Total revenue`, `Services and other`, FY2023 columns) and take the first after filtering.
- **Multi-column tables** — lines like `Americas $12,891 $11,654 $10,251 11%` need column 1 (FY2024), not total revenue from another line on the same page.
- **Company-specific labels** — AWS vs Digital Media vs Data Center; one keyword list does not fit all.
- **PDF text quality** — tables collapse, spacing breaks (Amazon, Salesforce), some regional revenue only in tables Netflix does not expose as text.
- **Unit scale** — Netflix reports in thousands; Apple file is quarterly not full 10-K.

---

## Issues we faced (and root causes)

| Issue | Example | Why it happened |
|-------|---------|-----------------|
| Wrong first number | Adobe geo: picked 21,505 (total revenue) not 12,891 (Americas) | Same page has multiple revenue lines; no label-aware pick |
| Percentage / year noise | 74%, 2024 in candidates | Fixed partially with filters; growth % still leaks |
| Swagger `company=string` | Saved as `string.pdf` | UI placeholder sent as value; fixed with slug resolver |
| Nested git repo | `frontend` not tracked | `create-next-app` init its own `.git` |
| Lenient eval metric | 100% on Adobe with wrong first picks | `any()` match counts if correct value is anywhere in list |
| Missing ground truth | Only Adobe in CSV so far | Manual 10-K reading is slow but required |

---

## Why this is not the right long-term approach

Keyword + regex on pdfplumber text is a **reasonable V1 demo**, not a production extractor.

1. **10-K layout is not text** — financial tables lose structure when flattened; the “right line” is often a table row, not a sentence.
2. **Regex cannot understand columns** — FY2024 vs FY2023 vs % change need table semantics, not `$[\d,]+` on the whole line.
3. **One-size keywords** — “segment” hits wrong pages; each issuer uses different segment names.
4. **No layout / position signal** — we ignore bounding boxes, headers, and “(dollars in millions)”.
5. **Candidate soup** — collecting all numbers then hoping evaluation finds one is not extraction; it pushes complexity to downstream logic.
6. **Brittle across filings** — small format changes break parsers; does not generalize to new companies without new rules.

**Better directions (not implemented here):**

- Structured table extraction (row label → FY2024 column)
- Layout-aware parsing (coordinates, section headers)
- LLM on retrieved snippets only (still local / controlled)
- Per-field rules generated from filing taxonomy (XBRL tags where available)

This project intentionally stops at V1 to show **measure → fail → explain → improve**, which is what interviewers care about.

---

## How to run

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```

API docs: http://localhost:8000/docs

**Upload a PDF** (auto-extracts):

```bash
curl -X POST http://localhost:8000/api/v1/upload \
  -F "file=@../data/adbe-2024-annual-report.pdf" \
  -F "overwrite=true"
```

**Evaluate** (needs `ground_truth.csv`):

```bash
curl -X POST http://localhost:8000/api/v1/evaluate -H "Content-Type: application/json" -d '{}'
```

### Batch extraction (all PDFs in `data/`)

```bash
cd backend
python scripts/batch_extract_v1.py --pdf-dir ../data
```

### Accuracy report (extraction vs PDF truth)

```bash
python scripts/build_accuracy_report.py
# → backend/app/data/extracted/v1/accuracy_report.json
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Planned V2 improvements

- Pick **first dollar amount on the label line** (not first on page)
- **Table-row parser**: label column + FY2024 column
- Stricter **line filters** (exclude `Total revenue`, `Cost of`, narrative)
- **Error analysis** wired to `GET /errors`
- Full **ground_truth.csv** for all 10 companies
- Re-run eval and compare **V1 vs V2** accuracy in README

---

## Project structure

```
.
├── README.md
├── data/                    # Local 10-K PDFs (gitignored)
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── api/             # FastAPI routes
│   │   ├── services/        # Extraction, retrieval, evaluation
│   │   ├── models/          # Domain types
│   │   └── data/            # pdfs, cache, extracted, ground_truth
│   └── scripts/
│       ├── batch_extract_v1.py
│       └── build_accuracy_report.py
└── frontend/                # Next.js (boilerplate)
```

---

## License / data

SEC filings are public documents. PDFs in `data/` are kept local and not committed to git. Use them only for this evaluation exercise.

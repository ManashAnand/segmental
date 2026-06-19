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
- **Only** local processing: FastAPI, pdfplumber, sentence-transformers, Postgres/pgvector, regex

---

## API (versioned)

| Version | Path | Status |
|---------|------|--------|
| **V1** | `POST /api/v1/upload` | Keyword/regex extraction |
| **V2** | `POST /api/v2/upload` | Embed entire PDF |
| **V2** | `POST /api/v2/query` | Ask any question — direct answer |
| **V2** | `POST /api/v2/extract` | Optional: 3 assignment fields (eval) |

**LLM:** Groq when `GROQ_API_KEY` is set in `backend/.env`; otherwise **Ollama** (`ollama` service in Docker).

```
app/api/routes/
  v1/upload.py
  v2/upload.py | query.py
```

### Environment (`backend/`)

| File | Purpose |
|------|---------|
| `.env` | Primary config + secrets (`GROQ_API_KEY`) — **gitignored** |
| `.env.local` | Optional machine-specific overrides — **gitignored** |
| `.env.example` | Committed template (copy to `.env`) |

---

## What we built

### Backend (`backend/`)

**V1 pipeline** (via upload):

```
PDF upload → page text (pdfplumber) → retrieval → regex/table parsing → results.json
```

**V2 pipeline:**

```
POST /api/v2/upload   → embed full PDF
POST /api/v2/query    → your question → answer (value + source_text)
POST /api/v2/extract  → optional: geo + segment + R&D for assignment eval
```

**Scripts** (not HTTP):

- `scripts/batch_extract_v1.py` — batch all PDFs → `data/extracted/v1/{company}_results.json`
- `scripts/build_accuracy_report.py` — compare extraction vs PDF truth → `accuracy_report.json`

### Frontend (`frontend/`)

Next.js boilerplate (not yet wired to the API).

### Data layout

```
data/                          # Source PDFs (local, not in git)
backend/app/data/
  pdfs/                        # Uploaded PDFs
  cache/                       # Cached page text (JSON)
  extracted/
    results.json               # Latest API upload results
    v1/                        # Batch script output + accuracy report
  ground_truth/
    ground_truth.csv           # Manual answer key (Adobe complete)
```

Postgres (Docker): `companies`, `document_chunks` (embeddings).

---

## V1 results (batch script, keyword retrieval)

Source: `backend/app/data/extracted/v1/accuracy_report.json` (9 companies, 25 fields, 1% tolerance)

| Metric | Score |
|--------|-------|
| **First-pick accuracy** | **16%** (4/25) |
| **Any-match accuracy** | **64%** (16/25) |

V1 fails mainly on **value selection** (right page, wrong first number). V2 targets better retrieval + label-aware parsing.

---

## Why keyword + regex is not enough

1. Flattened PDF text loses table structure.
2. Regex cannot pick FY2024 vs FY2023 columns.
3. Collecting all numbers on a page is not extraction.

**V2 direction:** semantic retrieval (done) → structured table/line parsing → new `/api/v2` endpoints.

---

## How to run

### Docker (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |
| Postgres | `localhost:5432` (user/pass/db: `segment`) |
| Ollama | `localhost:11434` |

```bash
# One-time: pull Ollama model (if not using Groq)
docker exec segment-ollama ollama pull llama3.2:3b

# Set GROQ_API_KEY in backend/.env

# V2 upload + embed
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@data/adbe-2024-annual-report.pdf" \
  -F "overwrite=true"

# V2 — ask anything
curl -X POST http://localhost:8000/api/v2/query \
  -H "Content-Type: application/json" \
  -d '{"company":"alphabet","question":"What were total Revenues for the year ended December 31, 2023, in millions?"}'

# V2 — assignment fields only (optional)
curl -X POST http://localhost:8000/api/v2/extract \
  -H "Content-Type: application/json" \
  -d '{"company":"alphabet"}'

# Stop
docker compose down

# Fresh DB + embeddings
docker compose down -v
```

First build downloads PyTorch + `all-MiniLM-L6-v2` (~few minutes).

### Backend (local, without Docker)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt -r requirements-docker.txt
python app.py
```

Semantic retrieval needs Postgres — use Docker for the full stack.

### Batch extraction & accuracy (CLI)

```bash
cd backend
python scripts/batch_extract_v1.py --pdf-dir ../data
python scripts/build_accuracy_report.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Planned improvements

- V2 accuracy report vs V1 baseline
- Stricter JSON schema validation / retries
- Frontend wired to V2 upload + extract

---

## Project structure

```
.
├── README.md
├── docker-compose.yml
├── data/                    # Local 10-K PDFs (gitignored)
├── backend/
│   ├── Dockerfile
│   ├── docker/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── v1/upload.py
│   │   │   └── v2/          # V2 routes (next)
│   │   ├── db/              # Postgres schema + pool
│   │   ├── services/        # extraction, embedding, ingest, retrieval
│   │   └── data/
│   └── scripts/
└── frontend/
```

---

## License / data

SEC filings are public documents. PDFs in `data/` are kept local and not committed to git.

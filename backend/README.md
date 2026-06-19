# Backend — 10-K Extraction API

FastAPI service for extracting and querying SEC 10-K filings. Supports two pipelines:

| Version | Approach | Entry point |
|---------|----------|-------------|
| **V1** | Keyword retrieval + regex/table parsing | `POST /api/v1/upload` |
| **V2** | Embed full PDF → pgvector RAG → LLM JSON answers | `POST /api/v2/upload`, `/query`, `/extract` |

Run via Docker from the repo root (`docker compose up`) or locally with a Postgres instance. See the [root README](../README.md) for the full system overview.

---

## Quick start

### Docker (recommended)

From the repository root:

```bash
docker compose up --build
```

| Endpoint | URL |
|----------|-----|
| Swagger UI | http://localhost:8000/docs |
| Health | http://localhost:8000/health |
| Postgres | `localhost:5432` (user/pass/db: `segment`) |
| Ollama | http://localhost:11434 |

First-time Ollama setup (if not using Groq):

```bash
docker exec segment-ollama ollama pull llama3.2:3b
```

After backend code changes, rebuild the API image:

```bash
docker compose build api && docker compose up -d api
```

### Local (without Docker)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt -r requirements-docker.txt
cp .env.example .env   # edit DATABASE_URL, GROQ_API_KEY, etc.
uvicorn app.main:app --reload --port 8000
```

V2 semantic search requires Postgres with pgvector. Use Docker for `db` even when running the API locally.

---

## Environment

Copy `.env.example` → `.env`. Optional overrides in `.env.local` (both gitignored).

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://segment:segment@localhost:5432/segment` | Postgres connection |
| `MODEL_NAME` | `all-MiniLM-L6-v2` | sentence-transformers embedding model |
| `EMBEDDING_DIM` | `384` | Vector dimension (must match schema) |
| `CHUNK_SIZE` | `1000` | Characters per ingest chunk |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `EMBED_BATCH_SIZE` | `32` | Embedding batch size |
| `RETRIEVAL_TOP_K` | `8` | Chunks sent to LLM (16 for analytical questions) |
| `LLM_PROVIDER` | `auto` | `auto` \| `groq` \| `ollama` |
| `GROQ_API_KEY` | — | Enables Groq when set |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq chat model |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base |
| `OLLAMA_MODEL` | `llama3.2:3b` | Local fallback model |

In Docker Compose, `DATABASE_URL` and `OLLAMA_BASE_URL` are overridden to use service hostnames (`db`, `ollama`).

---

## API reference

Base path: `/api`

### V1

#### `POST /api/v1/upload`

Upload a PDF and run keyword/regex extraction. Writes results to `app/data/extracted/results.json`.

```bash
curl -X POST http://localhost:8000/api/v1/upload \
  -F "file=@../data/apple-10k.pdf" \
  -F "company=apple"
```

### V2

#### `POST /api/v2/upload`

Save PDF, extract page text, chunk, embed, and store vectors in Postgres.

| Form field | Required | Description |
|------------|----------|-------------|
| `file` | yes | PDF file |
| `company` | no | Slug override (else derived from filename) |
| `overwrite` | no | Replace existing PDF (`true`/`false`) |

```bash
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@../data/alphabet-10k.pdf" \
  -F "company=alphabet" \
  -F "overwrite=true"
```

Response:

```json
{
  "company": "alphabet",
  "filename": "alphabet.pdf",
  "path": "...",
  "chunks_indexed": 477,
  "message": "PDF saved for alphabet"
}
```

Re-uploading the same file (matching SHA-256) skips re-embedding.

#### `POST /api/v2/query`

RAG query — retrieve chunks, answer with LLM.

```bash
curl -X POST http://localhost:8000/api/v2/query \
  -H "Content-Type: application/json" \
  -d '{
    "company": "alphabet",
    "question": "What were total Revenues for FY2023 in millions?"
  }'
```

Response fields (`answer` object):

| Field | Type | Description |
|-------|------|-------------|
| `answer` | string | Plain-English answer |
| `label` | string \| null | Metric / line item name |
| `value` | number \| null | Extracted numeric value |
| `unit` | string \| null | e.g. `millions` |
| `fiscal_year` | string \| null | e.g. `2023` |
| `source_text` | string \| null | Supporting snippet from filing |
| `retrieved_chunks` | array | Page, score, snippet for citations |
| `retrieval_scores` | number[] | Similarity scores |
| `chunks_used` | number | Chunks passed to LLM |

Analytical questions (`best`, `highest`, `maximum`, `which month`, etc.) trigger expanded retrieval and allow the LLM to compare figures across chunks.

#### `POST /api/v2/extract`

Fixed assignment extraction: geographic revenue, segment revenue, R&D expense.

```bash
curl -X POST http://localhost:8000/api/v2/extract \
  -H "Content-Type: application/json" \
  -d '{"company": "alphabet"}'
```

#### `GET /api/v2/companies/{company}/pdf`

Serve stored PDF with `Content-Disposition: inline` (for in-browser viewing).

#### `GET /api/v2/companies/{company}/info`

Metadata for a company slug:

```json
{
  "company": "alphabet",
  "pdf_available": true,
  "indexed": true,
  "page_count": 111,
  "chunk_count": 477,
  "filename": "alphabet.pdf"
}
```

---

## Architecture

### V1 pipeline

```
PDF → pdfplumber (page text) → keyword page retrieval → regex/table parsers → JSON results
```

Implemented in `app/services/extraction/service.py` and `app/services/retrieval/`.

### V2 pipeline

```
Upload:
  PDF → pdfplumber → chunk (1000/150) → all-MiniLM-L6-v2 → Postgres document_chunks

Query:
  question → embed query → pgvector top-k → financial rerank → LLM (Groq/Ollama) → JSON answer
```

Key modules:

```
app/
├── api/routes/
│   ├── v1/upload.py
│   └── v2/upload.py | query.py | extract.py | companies.py
├── db/
│   ├── schema.sql          # companies, document_chunks (vector(384))
│   └── pool.py
├── services/
│   ├── pdf_extraction/     # pdfplumber upload + page cache
│   ├── embedding/          # chunking + sentence-transformers
│   ├── ingest/             # embed + upsert to Postgres
│   ├── retrieval/chunks.py # pgvector search + financial rerank
│   ├── agent/              # prompts, QueryAgent, JSON parser
│   └── llm/                # Groq, Ollama, auto fallback
└── data/
    ├── pdfs/               # Stored PDFs ({slug}.pdf)
    ├── cache/              # Page text JSON cache
    ├── extracted/          # V1 results + v2 outputs
    ├── evaluation/         # V1/V2 showcase JSON for frontend
    └── ground_truth/       # Manual answer key CSV
```

### Retrieval details

1. Query embedding with the same model used at ingest.
2. Fetch `top_k × 3` candidates (cap 45) via cosine distance (`<=>`).
3. Rerank with boosts for `$`, dollar amounts, years, and financial keywords (revenue, segment, quarter, month names, etc.).
4. Pass top **8** chunks to LLM (**16** for analytical questions).

### LLM provider selection

| Mode | Behavior |
|------|----------|
| `auto` | Groq if `GROQ_API_KEY` set; fallback to Ollama on failure |
| `groq` | Groq only |
| `ollama` | Ollama only |

System prompts enforce JSON-only output and context-grounded answers. Analytical prompts allow max/min/rank when all numbers appear in retrieved chunks.

---

## Database

Schema: `app/db/schema.sql` (also applied via `docker/init-db.sql` on first boot).

| Table | Purpose |
|-------|---------|
| `companies` | Slug, filename, PDF hash, chunk count |
| `document_chunks` | Page number, chunk index, text, `embedding vector(384)` |

Reset embeddings:

```bash
docker compose down -v   # from repo root — wipes Postgres volume
```

---

## CLI scripts

Run from `backend/` with venv active:

```bash
# Batch V1 extraction for all PDFs in a directory
python scripts/batch_extract_v1.py --pdf-dir ../data

# Compare V1 output vs PDF-derived truth
python scripts/build_accuracy_report.py
```

Outputs land in `app/data/extracted/v1/`.

---

## Docker layout

| Path | Mounted | Purpose |
|------|---------|---------|
| `app/data/pdfs` | yes | Uploaded PDFs persist on host |
| `app/data/cache` | yes | Page text cache |
| `app/data/extracted` | yes | Extraction JSON |
| `app/data/ground_truth` | yes | Evaluation CSV |
| Application code | no (baked in image) | Rebuild after code changes |

The Dockerfile pre-downloads `all-MiniLM-L6-v2` and CPU PyTorch to avoid runtime downloads.

---

## Evaluation artifacts

| File | Description |
|------|-------------|
| `app/data/extracted/v1/accuracy_report.json` | V1 batch accuracy (16% first-pick) |
| `app/data/evaluation/v2_alphabet_showcase.json` | V2 Alphabet eval (100% on 5 queries) |
| `app/data/evaluation/v1_alphabet_showcase.json` | V1 Alphabet comparison data |

---

## Dependencies

- **FastAPI** + **uvicorn** — HTTP API
- **pdfplumber** — PDF text extraction
- **sentence-transformers** + **torch** — local embeddings
- **asyncpg** + **pgvector** — vector storage
- **httpx** — Groq / Ollama HTTP clients

See `requirements.txt` and `requirements-docker.txt`.

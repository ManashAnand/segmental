# Frontend — Segmental.ai

Next.js 16 app for the 10-K Intelligence Platform. Upload filings, view PDFs, chat with the V2 RAG agent, and compare V1 vs V2 extraction accuracy.

Requires the backend API running at `http://localhost:8000` (via Docker Compose from the repo root).

---

## Quick start

```bash
cd frontend
npm install
cp .env.local.example .env.local   # optional
npm run dev
```

Open http://localhost:3000

Production build:

```bash
npm run build
npm start
```

---

## Environment

| File | Purpose |
|------|---------|
| `.env.local` | Local overrides (gitignored) |
| `.env.local.example` | Template |

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | *(empty)* | Backend base URL. Leave empty to proxy `/api/*` → `http://localhost:8000` via Next.js rewrites |

If you set `NEXT_PUBLIC_API_URL=https://your-api.example.com`, all API calls go directly to that host (CORS must allow `localhost:3000`).

---

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Dashboard — upload zone, stats, recent uploads table |
| `/agent` | `app/agent/page.tsx` | Agent workspace — PDF viewer, chat, insights sidebar |
| `/compare` | `app/compare/page.tsx` | V1 vs V2 accuracy charts (Alphabet showcase) |

### Dashboard (`/`)

- Drag-and-drop PDF upload → `POST /api/v2/upload`
- On success, document added to Zustand store and redirects to `/agent`
- Stats derived from persisted document list

### Agent (`/agent`)

Three-column layout (`agent-workspace.tsx`):

| Panel | Component | Backend |
|-------|-----------|---------|
| Document sidebar | `document-sidebar.tsx` | Reads store; shows PDF/indexed badges via `/info` |
| PDF viewer | `pdf-viewer.tsx` | `GET /companies/{slug}/info`, PDF fetched as blob |
| Chat | `chat-panel.tsx` | `POST /api/v2/query` |
| Insights | `insights-panel.tsx` | Live metrics from query results + mock seed charts |

**PDF viewer:** Fetches the PDF once as a blob (avoids browser download prompts), displays in an iframe, supports page navigation and jump-to-page from chat citations.

**Chat:** Streams answer tokens, shows retrieved pages / extracted values / confidence. Updates sidebar field counts and insights panel on each successful query.

### Compare (`/compare`)

Loads static showcase JSON from `public/data/`:

- `v1_alphabet_showcase.json`
- `v2_alphabet_showcase.json`

Rendered with Recharts (EvilCharts-style gradients). No live API calls.

---

## API client

All backend calls go through `src/lib/api.ts`:

| Function | Endpoint | Used by |
|----------|----------|---------|
| `uploadTenK(file, company?, overwrite?)` | `POST /api/v2/upload` | Upload zone |
| `queryFiling(company, question)` | `POST /api/v2/query` | Chat panel |
| `getCompanyInfo(slug)` | `GET /api/v2/companies/{slug}/info` | PDF viewer, sidebar |
| `fetchCompanyPdfBlob(slug)` | `GET /api/v2/companies/{slug}/pdf` | PDF viewer |
| `companyPdfUrl(slug)` | PDF URL helper | Download button |

Types in `src/lib/types.ts` (`UploadResult`, `V2QueryResponse`, `CompanyInfo`, `LiveMetric`).

### Proxy setup

`next.config.ts` rewrites:

```
/api/:path*  →  http://localhost:8000/api/:path*
```

(or `NEXT_PUBLIC_API_URL` when set)

This keeps frontend requests same-origin in dev, avoiding CORS for browser fetches.

---

## State management

**Zustand** store (`src/lib/store.ts`) with `localStorage` persistence (`segmental.app`):

| State | Persisted | Description |
|-------|-----------|-------------|
| `documents` | yes | Uploaded + seed documents |
| `selectedDocId` | yes | Active filing in agent view |
| `messages` | no | Chat history (session) |
| `liveMetricsBySlug` | no | Metrics extracted per query |
| `companyInfoBySlug` | no | Cached `/info` responses |
| `pdfPage` | no | Current PDF page |

Seed demo documents (`mock-data.ts`) ship without backend PDFs. Only **uploaded** filings (or those present in `backend/app/data/pdfs/`) show a real PDF and support live queries.

Helpers:

- `useSelectedDocument()` — current doc from store
- `useDocumentStats()` — aggregate stats for dashboard cards
- `uploadResultToDoc()` — maps API upload response → `UploadedDoc`

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── agent/page.tsx        # Agent workspace
│   ├── compare/page.tsx      # V1 vs V2 compare
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── agent/                # PDF viewer, chat, sidebar, insights
│   ├── compare/              # Compare charts + page shell
│   ├── ui/                   # shadcn-style primitives
│   ├── app-header.tsx
│   ├── dashboard.tsx
│   ├── upload-zone.tsx
│   ├── stats-cards.tsx
│   └── recent-uploads-table.tsx
└── lib/
    ├── api.ts                # Backend client
    ├── store.ts              # Zustand global state
    ├── types.ts              # API + domain types
    ├── mock-data.ts          # Seed docs + demo metrics
    ├── upload-helpers.ts
    └── showcase-types.ts     # Compare page JSON types

public/
└── data/
    ├── v1_alphabet_showcase.json
    └── v2_alphabet_showcase.json
```

---

## UI stack

| Library | Use |
|---------|-----|
| **Next.js 16** (App Router) | Routing, SSR, API rewrites |
| **React 19** | UI |
| **Tailwind CSS 4** | Styling, dark theme |
| **Radix UI** | Tabs, collapsible, dropdown, progress |
| **Framer Motion** | Page transitions, list animations |
| **Recharts** | Compare + insights charts |
| **react-markdown** | Agent answer rendering |
| **Zustand** | Client state + persistence |
| **lucide-react** | Icons |

Design tokens and glow-card styles live in `globals.css` (CSS variables for chart colors, sidebar, primary accent).

---

## Development notes

### After backend API changes

Rebuild the Docker API image from repo root:

```bash
docker compose build api && docker compose up -d api
```

### After `next.config.ts` changes

Restart the Next dev server.

### Lint

```bash
npm run lint
```

### Adding a new API integration

1. Add types to `src/lib/types.ts`
2. Add fetch wrapper to `src/lib/api.ts`
3. Call from component; update store if shared state needed

### Chat suggested prompts

Dynamic per selected document (`chat-panel.tsx`) — e.g. revenue, R&D, geographic segments, net income for the active company.

---

## Related docs

- [Root README](../README.md) — full system design, V2 RAG rationale, Docker overview
- [Backend README](../backend/README.md) — API specs, env vars, retrieval architecture

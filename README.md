# CertiFlow — Digital AI Compliance Worker

> Closing the Resource Gap in Construction Safety Compliance.

CertiFlow is a backend platform that automates construction site safety audits using AI. A construction manager uploads a site report or other text-bearing document, and CertiFlow's AI worker cross-references the extracted content against OSHA regulations to flag likely violations automatically.

---

## Architecture

CertiFlow uses a **microservices architecture** with three independent services:

```
Client (SvelteKit)
        ↓
  [api-gateway :3000]  — single entry point, JWT auth, request routing
        ↓
  [compliance-service :3001]  — projects, reports, violations (DDD)
        ↓ (BullMQ job)
  [ai-worker :3002]  — Gemini RAG audit agent
```

### Design Patterns Used

| Pattern | Where | Why |
|---|---|---|
| **Microservices** | 3 separate services | Independent deployment, isolated failures |
| **Domain-Driven Design** | compliance-service layers | Business logic isolated from infrastructure |
| **Event-Driven Architecture** | BullMQ + Redis queue | Async AI processing, user never waits |
| **Cloud-Native** | Stateless services, Cloudinary, Supabase | No local state, scales independently |
| **RAG** | ai-worker retriever | AI cites real OSHA rules, not guesses |

---

## Tech Stack

| Category | Tool |
|---|---|
| Language | TypeScript |
| Backend Framework | Node.js + Express |
| Frontend | SvelteKit + Tailwind CSS |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| AI Model | Gemini 1.5 Flash |
| Queue | BullMQ + Upstash Redis |
| File Storage | Cloudinary |
| Logging | Winston |
| Testing | Jest |
| Containers | Docker + Docker Compose |

---

## Project Structure

```
certiflow/
├── api-gateway/                  # Port 3000 — routes & auth
│   └── src/
│       ├── middleware/
│       │   ├── auth.middleware.ts
│       │   └── error.middleware.ts
│       └── index.ts
│
├── services/
│   ├── compliance-service/       # Port 3001 — DDD core
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── domain/           ← Pure business logic (no DB, no HTTP)
│   │       │   ├── entities/
│   │       │   │   ├── Report.entity.ts
│   │       │   │   └── Violation.entity.ts
│   │       │   ├── value-objects/
│   │       │   │   └── ViolationSeverity.vo.ts
│   │       │   └── repositories/ ← Interfaces only (contracts)
│   │       ├── application/      ← Orchestration (use cases, DTOs)
│   │       │   ├── use-cases/
│   │       │   │   ├── UploadReport.usecase.ts
│   │       │   │   ├── GetViolations.usecase.ts
│   │       │   │   └── ResolveViolation.usecase.ts
│   │       │   └── dto/
│   │       └── infrastructure/   ← DB, queue, file storage, HTTP
│   │           ├── prisma/
│   │           ├── repositories/ ← Prisma implementations
│   │           ├── queue/        ← BullMQ publisher
│   │           ├── cloudinary/   ← File upload
│   │           └── http/         ← Express routes
│   │
│   └── ai-worker/                # Port 3002 — AI agent
│       └── src/
│           ├── agent/
│           │   └── auditor.ts    ← Gemini agentic loop
│           ├── rag/
│           │   └── retriever.ts  ← OSHA PDF context retrieval
│           └── queue/
│               └── consumer.ts   ← BullMQ job listener
│
├── shared/                       # Types + utils for all services
│   └── src/
│       ├── types/index.ts
│       └── utils/index.ts
│
├── frontend/                     # SvelteKit dashboard
├── docker-compose.yml
└── certiflow.code-workspace
```

---

## Quick Start

### Prerequisites
- Node.js v20+
- Docker & Docker Compose
- Accounts: Supabase, Cloudinary, Upstash Redis, Google AI Studio

### 1. Clone and install
```bash
git clone https://github.com/yourusername/certiflow.git
cd certiflow
npm install
```

### 2. Environment setup
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Start with Docker
```bash
docker-compose up --build
```

### 4. Run database migrations
```bash
cd services/compliance-service
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start development (without Docker)
```bash
# Terminal 1
cd services/compliance-service && npm run dev

# Terminal 2
cd services/ai-worker && npm run dev

# Terminal 3
cd api-gateway && npm run dev
```

---

## API Endpoints

All requests go through the API Gateway on port `3000`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Gateway health check |
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project |
| `PATCH` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project if it has no reports |
| `POST` | `/api/reports` | Upload site report (triggers AI audit) |
| `GET` | `/api/reports` | List all reports |
| `GET` | `/api/reports/:id/violations` | Get violations for a report |
| `PATCH` | `/api/violations/:id/resolve` | Mark violation as resolved |

---

## Testing

```bash
# Run all tests
npm test

# Run tests for a specific service
cd services/compliance-service && npm test
cd services/ai-worker && npm test
```

Tests cover:
- Domain entity business rules (Report, Violation)
- Project update/delete use cases
- State transition validation
- AI response parsing

---

## Health Checks

- Gateway: `http://localhost:3000/health`
- Compliance: `http://localhost:3001/health`
- AI Worker: `http://localhost:3002/health`

---

*Built by Michelle — demonstrating microservices, DDD, cloud-native architecture, and RAG-based AI agents*

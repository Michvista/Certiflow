# CertiFlow — Architecture Document

> This document explains the architectural decisions made in CertiFlow.
> It is intended for technical reviewers and potential employers.

---

## Overview

CertiFlow is a **Digital AI Compliance Worker** for construction companies.
It automates the review of site reports against OSHA safety regulations using
a RAG-based AI agent, built on a microservices architecture.

---

## 1. Microservices Architecture

CertiFlow is split into **3 independent services**, each with its own
codebase, `package.json`, port, and responsibility.

```
┌─────────────────────────────────────────────────┐
│                   CLIENT (SvelteKit)             │
└──────────────────────┬──────────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────┐
│              API GATEWAY  :3000                  │
│  - Single entry point for all requests           │
│  - JWT authentication middleware                 │
│  - Proxies requests to correct service           │
└───────────┬─────────────────────┬───────────────┘
            │ HTTP proxy          │ HTTP proxy
            ▼                     ▼
┌───────────────────┐   ┌────────────────────────┐
│ COMPLIANCE SERVICE│   │      AI WORKER          │
│      :3001        │   │        :3002            │
│                   │   │                         │
│ - Manages Projects│   │ - Listens to Redis queue│
│ - Manages Reports │   │ - Runs Gemini AI audit  │
│ - Manages Violations  │ - RAG against OSHA PDF  │
│ - Publishes queue │   │ - Saves violations to DB│
│   jobs to Redis   │   │                         │
└───────┬───────────┘   └────────────┬────────────┘
        │                            │
        │    ┌───────────────┐       │
        └───►│  Redis Queue  │◄──────┘
             │  (BullMQ)     │
             └───────────────┘
        │
        ▼
┌───────────────────┐
│  PostgreSQL (x1)  │
│  via Supabase     │
│  Prisma ORM       │
└───────────────────┘
```

### Why 3 services and not 1?

| Concern | Explanation |
|---|---|
| **Separation of concerns** | Compliance data management is a different job than AI processing |
| **Independent scaling** | If 100 reports are uploaded at once, only the AI worker needs to scale up — the compliance API stays fast |
| **Fault isolation** | If Gemini API is slow or down, the compliance service still works. Users can upload reports and check past results |
| **Qonstrue alignment** | Mirrors how Qonstrue's Digital AI Workers operate — a manager service (compliance) and a specialist worker (ai-worker) |

---

## 2. Domain-Driven Design (DDD)

Inside `compliance-service`, the code is organised by **business meaning**,
not by technical role.

```
compliance-service/src/
│
├── domain/                   ← PURE BUSINESS LOGIC
│   │                           No database. No HTTP. No framework.
│   │                           Just TypeScript classes and rules.
│   │
│   ├── entities/
│   │   ├── Report.entity.ts      "What IS a Report? What can it do?"
│   │   └── Violation.entity.ts   "What IS a Violation? What rules apply?"
│   │
│   ├── value-objects/
│   │   └── ViolationSeverity.vo.ts  "CRITICAL/MAJOR/MINOR with validation"
│   │
│   └── repositories/
│       └── index.ts              "Interface contracts for data access"
│                                  (no implementation — that's infrastructure's job)
│
├── application/              ← ORCHESTRATION LAYER
│   │                           Coordinates between domain and infrastructure.
│   │                           Each file = one use case.
│   │
│   ├── use-cases/
│   │   ├── UploadReport.usecase.ts     "What happens when a report is uploaded?"
│   │   ├── GetViolations.usecase.ts    "How do we retrieve violations?"
│   │   └── ResolveViolation.usecase.ts "What does resolving a violation mean?"
│   │
│   └── dto/
│       └── report.dto.ts           "What data shape does the API accept?"
│
└── infrastructure/           ← TECHNICAL IMPLEMENTATION
    │                           Database connections, file storage, queues.
    │                           This layer is allowed to know about Prisma, Cloudinary, Redis.
    │
    ├── prisma/
    │   └── client.ts               Prisma client singleton
    ├── repositories/
    │   └── PrismaReport.repository.ts  Implements the domain repository interface
    ├── cloudinary/
    │   └── Cloudinary.upload.ts    File upload implementation
    ├── queue/
    │   └── BullMQ.queue.ts         Redis queue publisher
    └── http/
        └── routes.ts               Express route handlers
```

### Why DDD?

The key insight: **the `domain/` folder has zero imports from any library.**
It only imports from other domain files and from TypeScript itself.

This means:
- Business rules are testable without a database
- Swapping Prisma for a different ORM only affects `infrastructure/`
- Swapping Cloudinary for S3 only affects `infrastructure/`
- The core compliance logic never changes when infrastructure changes

---

## 3. Cloud-Native Design

CertiFlow implements the three cloud-native pillars without requiring Docker
knowledge to understand:

### Pillar 1: Statelessness

The servers hold **no state in memory**. Every piece of data lives externally:

| Data | Where it lives |
|---|---|
| Reports, violations, projects | Supabase (PostgreSQL) |
| Uploaded site photos and PDFs | Cloudinary |
| Queue jobs | Redis (Upstash) |

If any service crashes and restarts, zero data is lost.

### Pillar 2: Elasticity via Async Queue

When a report is uploaded, the compliance service does NOT wait for the AI
to finish. It:

1. Saves the report with status `PENDING`
2. Immediately responds: `{ success: true, message: "Received. Analyzing..." }`
3. Drops a job into the Redis queue: `{ reportId, fileUrl, projectName }`

The AI worker independently picks up the job, runs the audit (which can take
5–30 seconds), and updates the database when complete.

**Why this matters:** If 50 reports are uploaded simultaneously, the API
stays fast. Redis holds all 50 jobs and the AI worker processes them one by
one. Nothing crashes. This is elasticity.

### Pillar 3: Observability

Shared services use a Winston-backed logger. Every significant event is
logged with context:

```
[INFO] [compliance-service] Report uploaded { reportId: "abc123", projectId: "p1" }
[INFO] [compliance-service] Audit job published to queue { reportId: "abc123" }
[INFO] [ai-worker] Job received from queue { reportId: "abc123" }
[INFO] [ai-worker] Gemini analysis complete { reportId: "abc123", violationsFound: 3 }
[ERROR] [ai-worker] Gemini API failed { reportId: "abc123", error: "Rate limit exceeded" }
```

This means if an audit silently fails, the logs tell you exactly where and why.

---

## 4. RAG-Based AI Agent

The AI worker does not just send a prompt to Gemini. It follows an
**agentic loop** with retrieval:

```
Step 1 — OBSERVE
  Download the uploaded report from storage

Step 2 — RETRIEVE
  Extract readable text from PDFs and text-like files when possible
  Load the OSHA 29 CFR 1926 Construction Safety Standards PDF (or fallback excerpt)
  Select relevant OSHA sections as context

Step 3 — ANALYZE
  Gemini cross-references the extracted report text against the OSHA rules
  System prompt defines its role as "Senior Construction Safety Auditor"

Step 4 — STRUCTURE
  Gemini returns a JSON array of violations:
  [{ severity, ruleReference, description, suggestion, sector }]

Step 5 — PERSIST
  AI worker saves each violation to the database
  Updates report status to COMPLETE
```

This is RAG (Retrieval-Augmented Generation) because the AI answers are
**grounded in a real document** (OSHA standards), not based on general
training data alone.

---

## 5. Tech Stack Summary

| Layer | Technology | Reason |
|---|---|---|
| Language | TypeScript | Type safety, catches errors at compile time |
| Services | Node.js + Express | Lightweight, familiar, widely used |
| Frontend | SvelteKit + Tailwind | Fast, reactive, minimal boilerplate |
| ORM | Prisma | Type-safe database queries |
| Database | Supabase (PostgreSQL) | Managed, cloud-native, free tier |
| Queue | BullMQ + Upstash Redis | Reliable async job processing |
| AI | Gemini 1.5 Flash | Used here as a text-first audit model over extracted report content |
| File Storage | Cloudinary | Managed uploads, free tier |
| Logging | Winston | Structured, queryable logs |
| Testing | Jest | Industry standard, works with TypeScript |
| Containers | Docker + Docker Compose | Reproducible local development |
| Monorepo | npm workspaces | Single repo, shared types across services |

---

## 6. Testing Strategy

Following the same pattern as production Node.js services:

```
Unit tests     → domain/ entities and value objects (no DB needed)
Integration    → application/ use cases (mock infrastructure)
E2E            → HTTP routes via supertest
```

The domain layer is the most tested because it contains the most critical
business logic — violation severity rules, report state transitions, etc.

---

*Built by Michelle | Reapplication project for Qonstrue Backend Engineer role*

# CuroMD Frontend API Architecture

This document defines the data fetching and API integration architecture for all CuroMD frontend applications. It is written for a **microservices backend** (multiple NestJS services), a **single API gateway**, a **dedicated auth service**, a **message broker** for inter-service communication, and **separate frontend repos** (no monorepo).

The core premise: frontends are thin clients. Business logic lives in NestJS services. The frontend's job is to fetch data cleanly, display it accurately, and send mutations to the right endpoint — nothing more.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Type Sharing: OpenAPI + Orval](#2-type-sharing-openapi--orval)
3. [API Gateway Communication](#3-api-gateway-communication)
4. [Authentication Flow](#4-authentication-flow)
5. [TanStack Query Setup](#5-tanstack-query-setup)
6. [Using Generated Hooks](#6-using-generated-hooks)
7. [Custom Hooks for Complex Cases](#7-custom-hooks-for-complex-cases)
8. [Cross-Service Data Fetching](#8-cross-service-data-fetching)
9. [Mutation Pattern](#9-mutation-pattern)
10. [Eventual Consistency and Polling](#10-eventual-consistency-and-polling)
11. [Error Handling](#11-error-handling)
12. [Per-Frontend Configuration](#12-per-frontend-configuration)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  curo-pharmacy  curo-doctor  curo-patient  curo-lab  curo-rec  │
│  (Next.js)      (Next.js)    (Next.js)     (Next.js) (Next.js) │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (REST, JWT in header)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                               │
│  • JWT validation (delegates to auth service)                   │
│  • Request routing to downstream services                       │
│  • Rate limiting, logging, CORS                                 │
│  • OpenAPI spec aggregation                                     │
└──┬──────────┬──────────┬──────────┬──────────┬─────────────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
 Auth      Pharmacy  Prescription  Patient    Lab
 Service   Service    Service     Service   Service
 (NestJS)  (NestJS)   (NestJS)   (NestJS)  (NestJS)
                         │          │
                    ─────┴──────────┴─────
                    │   MESSAGE BROKER   │
                    │ (inter-service     │
                    │  communication)    │
                    ─────────────────────
```

**Key rules:**
- Frontends **never** call a backend service directly — all requests go through the gateway
- The gateway validates the JWT on every request; services trust the gateway
- Services communicate with each other via the message broker, **not** via direct HTTP calls
- Frontends are unaware of which service ultimately handles a request; they only know the gateway URL and resource paths

---

## 2. Type Sharing: OpenAPI + Orval

This is the most important architectural decision in the frontend stack. Instead of manually maintaining shared type packages across separate repos, types and API hooks are **generated automatically** from the OpenAPI specs that each NestJS service produces.

### How It Works

```
NestJS service                    Frontend repo
─────────────────                 ─────────────────────────────────
@nestjs/swagger decorators   →    OpenAPI spec (JSON/YAML)
  on controllers/DTOs        →    ↓ orval codegen
                             →    src/api/generated/
                             →      pharmacy.ts   ← types + axios client
                             →      patients.ts   ← types + axios client
                             →    src/hooks/generated/
                             →      usePharmacy.ts  ← TanStack Query hooks
                             →      usePatients.ts  ← TanStack Query hooks
```

### NestJS Side: Exposing the Spec

Each NestJS service exposes its OpenAPI spec at `/api-spec` (or the gateway aggregates them all at `/docs/spec`). With `@nestjs/swagger`:

```typescript
// main.ts (each NestJS service)
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Pharmacy Service')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);

// Also expose raw JSON spec for codegen
app.use('/api-spec', (req, res) => res.json(document));
```

Decorating DTOs and controllers:

```typescript
// prescription.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DispensePrescriptionDto {
  @ApiProperty({ example: 'rx_001' })
  prescriptionId: string;

  @ApiProperty({ example: 'staff_001' })
  dispensedBy: string;
}

// prescriptions.controller.ts
@ApiTags('prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  @Get()
  @ApiOperation({ summary: 'List prescriptions with filters' })
  @ApiResponse({ status: 200, type: PaginatedPrescriptionsResponse })
  findAll(@Query() filters: PrescriptionFiltersDto) { ... }

  @Post(':id/dispense')
  @ApiOperation({ summary: 'Dispense a prescription' })
  @ApiResponse({ status: 201, type: DispensingRecordResponse })
  dispense(@Param('id') id: string, @Body() dto: DispensePrescriptionDto) { ... }
}
```

### Frontend Side: Orval Config

Each frontend has its own `orval.config.ts` pointing at the services it needs:

```typescript
// orval.config.ts (curo-pharmacy frontend)
import { defineConfig } from '@orval/core';

export default defineConfig({
  pharmacy: {
    input: {
      target: `${process.env.GATEWAY_URL}/pharmacy/api-spec`,
    },
    output: {
      mode: 'tags-split',           // split by controller tag
      target: 'src/api/generated',  // generated API client files
      schemas: 'src/types/generated', // generated TypeScript types
      client: 'axios',
      override: {
        mutator: {
          path: 'src/lib/api/axios-instance.ts', // custom axios instance with auth
          name: 'axiosInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write src/api/generated src/types/generated',
    },
  },

  patients: {
    input: {
      target: `${process.env.GATEWAY_URL}/patients/api-spec`,
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated/patients',
      schemas: 'src/types/generated/patients',
      client: 'react-query',  // generate TanStack Query hooks directly
      override: {
        mutator: {
          path: 'src/lib/api/axios-instance.ts',
          name: 'axiosInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
```

Run codegen:

```bash
npx orval           # regenerate all
npx orval --config  # from orval.config.ts
```

### What Gets Generated

```
src/
  types/
    generated/
      pharmacy/
        prescription.ts     # PrescriptionDto, PrescriptionStatus, PaginatedPrescriptionsResponse, etc.
        dispensing.ts       # DispensingRecordDto, DispensePrescriptionDto, etc.
        medication.ts       # MedicationDto, StockLevel, etc.
      patients/
        patient.ts          # PatientDto, PatientFiltersDto, etc.
  api/
    generated/
      pharmacy/
        prescriptionsApi.ts  # getPrescriptions(), getPrescriptionsId(), postPrescriptionsIdDispense()
        dispensingApi.ts
        medicationsApi.ts
      patients/
        patientsApi.ts
  hooks/
    generated/             # when using client: 'react-query'
      useGetPrescriptions.ts
      usePostPrescriptionsIdDispense.ts
```

### Keeping Types in Sync

Add to CI pipeline in each frontend repo:

```yaml
# .github/workflows/check-types.yml
- name: Regenerate API types
  run: npx orval

- name: Check for type drift
  run: git diff --exit-code src/types/generated src/api/generated
  # Fails the build if generated files are out of date
```

This ensures that if a backend changes an endpoint without the frontend regenerating, the CI pipeline fails with a clear diff rather than a runtime error.

---

## 3. API Gateway Communication

All HTTP requests from frontends go to the gateway. The frontend is only aware of one base URL.

### Axios Instance (Custom Mutator for Orval)

This is the single configured HTTP client. Orval uses it as the transport for all generated API calls.

```typescript
// src/lib/api/axios-instance.ts

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens } from '@/lib/auth/tokens';

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  withCredentials: true, // send cookies on cross-origin requests
});

// Inject auth token on every request
axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry globally
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue requests while a refresh is in flight
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
              resolve(axiosInstance(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        pendingQueue.forEach(({ resolve }) => resolve(newToken));
        pendingQueue = [];
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return axiosInstance(original);
      } catch {
        pendingQueue.forEach(({ reject }) => reject(error));
        pendingQueue = [];
        clearTokens();
        window.location.href = '/login?session_expired=true';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeApiError(error));
  }
);

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>; // field-level validation errors from NestJS
}

function normalizeApiError(error: AxiosError): ApiError {
  const data = error.response?.data as Record<string, unknown> | undefined;
  return {
    status: error.response?.status ?? 0,
    code: (data?.code as string) ?? 'NETWORK_ERROR',
    message: (data?.message as string) ?? error.message,
    details: data?.details as Record<string, string[]> | undefined,
  };
}
```

### Token Storage

```typescript
// src/lib/auth/tokens.ts

const ACCESS_TOKEN_KEY = 'curomd_access_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  // Refresh token is in httpOnly cookie — cleared server-side on logout
}

export async function refreshAccessToken(): Promise<string> {
  // Refresh token is in httpOnly cookie, sent automatically
  const res = await axios.post(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/auth/refresh`, {}, {
    withCredentials: true,
  });
  const newToken = res.data.accessToken;
  setAccessToken(newToken);
  return newToken;
}
```

**Token storage rationale:**
- **Access token** → `sessionStorage` (short-lived, 15min; cleared on tab close; safe from XSS since it's not `localStorage`)
- **Refresh token** → `httpOnly` cookie set by the gateway/auth service (inaccessible to JavaScript; sent automatically)

---

## 4. Authentication Flow

Auth is handled by a dedicated auth service. The gateway validates tokens before forwarding requests to downstream services.

### Login Flow

```
Frontend          Gateway           Auth Service
   │                │                    │
   │─── POST /auth/login ───────────────▶│
   │    { email, password }              │
   │                │                    │
   │                │◀── { accessToken, │
   │                │     user } + Set-  │
   │                │     Cookie:        │
   │                │     refreshToken   │
   │                │     (httpOnly)     │
   │                │                    │
   │◀── { accessToken, user } ──────────│
   │  + Set-Cookie: refreshToken         │
   │    (httpOnly, forwarded by gateway) │
   │                │                    │
   │ store access   │                    │
   │ token in       │                    │
   │ sessionStorage │                    │
```

### Per-Request Flow

```
Frontend          Gateway           Backend Service
   │                │                    │
   │─── GET /prescriptions ─────────────▶│
   │    Authorization: Bearer <JWT>      │
   │                │                    │
   │         validate JWT                │
   │         (gateway checks sig         │
   │          + expiry)                  │
   │                │                    │
   │                │─── GET /prescriptions ──▶│
   │                │    (gateway injects user  │
   │                │     context as header)    │
   │                │                    │
   │◀─── 200 { data } ──────────────────│
```

### AuthContext

```typescript
// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { axiosInstance } from '@/lib/api/axios-instance';
import { setAccessToken, clearTokens } from '@/lib/auth/tokens';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount (refresh token in cookie may still be valid)
  useEffect(() => {
    axiosInstance.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await axiosInstance.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  async function logout() {
    await axiosInstance.post('/auth/logout').catch(() => {});
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

---

## 5. TanStack Query Setup

```typescript
// src/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { isApiError } from '@/lib/api/axios-instance';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,       // 30s default; override per hook
        gcTime: 5 * 60 * 1000,  // 5min garbage collection
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          // Never retry client errors (4xx) — they won't change without user action
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
      mutations: {
        retry: false, // Never auto-retry mutations in a clinical system
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

Root layout:

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 6. Using Generated Hooks

Orval generates hooks directly from the OpenAPI spec. These are the primary way components fetch data.

### Generated Hook Examples

```typescript
// src/hooks/generated/useGetPrescriptions.ts (generated by orval)
export function useGetPrescriptions(
  params?: GetPrescriptionsParams,
  options?: UseQueryOptions<PaginatedPrescriptionsResponse>
) {
  return useQuery({
    queryKey: getGetPrescriptionsQueryKey(params),
    queryFn: () => getPrescriptions(params),
    ...options,
  });
}

export function usePostPrescriptionsIdDispense(
  options?: UseMutationOptions<DispensingRecordDto, ApiError, { id: string; data: DispensePrescriptionDto }>
) {
  return useMutation({
    mutationFn: ({ id, data }) => postPrescriptionsIdDispense(id, data),
    ...options,
  });
}
```

### Using Generated Hooks in Components

```tsx
// src/components/features/prescriptions/PrescriptionTable.tsx
'use client';

import { useGetPrescriptions } from '@/hooks/generated/useGetPrescriptions';
import { useQueryState } from 'nuqs';

export function PrescriptionTable() {
  const [status, setStatus] = useQueryState('status');
  const [page, setPage] = useQueryState('page', { defaultValue: '1' });

  const { data, isLoading, isError, error } = useGetPrescriptions(
    { status: status ?? undefined, page: Number(page), pageSize: 20 },
    { staleTime: 15_000 } // override default for prescription status
  );

  if (isLoading) return <PrescriptionTableSkeleton />;
  if (isError) return <QueryErrorState error={error} />;

  return (
    <>
      <StatusFilter value={status} onChange={setStatus} />
      <Table data={data.data} />
      <Pagination total={data.total} page={data.page} onChange={p => setPage(String(p))} />
    </>
  );
}
```

### URL-Driven Filter State

Use `nuqs` to put filter/search state in the URL instead of `useState`. This gives you shareable URLs, browser back-button support, and no filter state lost on refresh:

```bash
npm install nuqs
```

```tsx
// src/app/(dashboard)/prescriptions/page.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export default function PrescriptionsPage() {
  return (
    <NuqsAdapter>
      <PrescriptionTable />
    </NuqsAdapter>
  );
}
```

```typescript
// Usage in any client component
const [search, setSearch] = useQueryState('search', { throttleMs: 300 });
const [status, setStatus] = useQueryState('status');
const [priority, setPriority] = useQueryState('priority');
```

---

## 7. Custom Hooks for Complex Cases

Orval-generated hooks cover standard CRUD. Write custom hooks on top of them for: polling, cross-service composition, conditional fetching, cache invalidation across domains.

### Polling Hook

```typescript
// src/hooks/usePendingPrescriptions.ts

import { useGetPrescriptions } from '@/hooks/generated/useGetPrescriptions';

export function usePendingPrescriptions() {
  return useGetPrescriptions(
    { status: 'pending', pageSize: 50 },
    {
      staleTime: 0,          // always treat as stale
      refetchInterval: 30_000, // poll every 30s
      refetchIntervalInBackground: false, // pause when tab not focused
    }
  );
}
```

### Mutation Hook with Cache Invalidation

Generated mutation hooks don't know which queries to invalidate. Write a wrapper that adds that logic:

```typescript
// src/hooks/useDispensePrescription.ts

import { useQueryClient } from '@tanstack/react-query';
import { usePostPrescriptionsIdDispense } from '@/hooks/generated/usePostPrescriptionsIdDispense';
import { getGetPrescriptionsQueryKey } from '@/hooks/generated/useGetPrescriptions';
import { getGetDispensingRecordsQueryKey } from '@/hooks/generated/useGetDispensingRecords';
import { getGetMedicationsQueryKey } from '@/hooks/generated/useGetMedications';
import { toast } from 'sonner';

export function useDispensePrescription() {
  const queryClient = useQueryClient();

  return usePostPrescriptionsIdDispense({
    onSuccess: (record) => {
      // Invalidate every cache entry affected by a dispense
      queryClient.invalidateQueries({ queryKey: getGetPrescriptionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDispensingRecordsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() }); // stock changed
      toast.success('Prescription dispensed successfully.');
    },
    onError: (error) => {
      // NestJS validation errors come back as details object
      if (error.details) {
        Object.values(error.details).flat().forEach(msg => toast.error(msg));
      } else {
        toast.error(error.message);
      }
    },
  });
}
```

Usage in component:

```tsx
function DispenseButton({ prescriptionId }: { prescriptionId: string }) {
  const { mutate, isPending } = useDispensePrescription();
  const { user } = useAuth();

  return (
    <Button
      onClick={() => mutate({ id: prescriptionId, data: { prescriptionId, dispensedBy: user.id } })}
      disabled={isPending}
    >
      {isPending ? 'Dispensing...' : 'Dispense'}
    </Button>
  );
}
```

---

## 8. Cross-Service Data Fetching

The pharmacy frontend may need data from services other than its own — for example, patient demographics from the patient service, or prescription history from the prescription service.

### Option A: Parallel Queries (Preferred for Simple Cases)

When a page needs data from two services, run parallel queries. TanStack Query deduplicates and caches each independently:

```typescript
// src/hooks/usePatientPrescriptionView.ts

import { useGetPatientId } from '@/hooks/generated/patients/useGetPatientId';
import { useGetPrescriptions } from '@/hooks/generated/prescriptions/useGetPrescriptions';
import { useGetDispensingRecords } from '@/hooks/generated/useGetDispensingRecords';

export function usePatientPrescriptionView(patientId: string) {
  const patient = useGetPatientId(patientId, {
    staleTime: 5 * 60_000, // demographics change rarely
  });

  const prescriptions = useGetPrescriptions(
    { patientId, pageSize: 100 },
    { staleTime: 30_000 }
  );

  const dispensingRecords = useGetDispensingRecords(
    { patientId },
    { staleTime: 30_000 }
  );

  return {
    patient,
    prescriptions,
    dispensingRecords,
    isLoading: patient.isLoading || prescriptions.isLoading || dispensingRecords.isLoading,
    isError: patient.isError || prescriptions.isError || dispensingRecords.isError,
  };
}
```

Each query maps to a different gateway route (and therefore a different backend service), but from the frontend's perspective it's all the same gateway URL.

### Option B: Push Aggregation to the Gateway (For Repeated or Complex Patterns)

If the same cross-service data combination is needed across multiple pages, or if the number of round trips becomes a performance concern, ask the gateway team to expose a **BFF (Backend for Frontend) endpoint** that aggregates the data in a single response:

```
GET /bff/pharmacy/patient-overview/:patientId
→ gateway calls patient service + prescription service internally
→ returns combined { patient, prescriptions, recentDispensing }
```

This is preferable when:
- The same combination is fetched on 3+ pages
- The data volume makes parallel requests expensive
- You need the gateway to apply cross-service business logic

Orval will generate a hook for this endpoint like any other once it's in the spec.

### Stale Time Strategy for Cross-Service Data

Different services have different data freshness requirements. Set `staleTime` per hook based on how frequently the source data changes, not which frontend is consuming it:

| Data | Service | Recommended staleTime |
|---|---|---|
| Stock levels | Pharmacy | `10_000` (10s) — changes with every dispense |
| Prescription status | Prescription | `15_000` (15s) |
| Dispensing records | Pharmacy | `30_000` (30s) |
| Active encounters | Encounter | `10_000` (10s) |
| Patient demographics | Patient | `300_000` (5min) — changes rarely |
| Lab results (pending) | Lab | `20_000` (20s) |
| Lab results (completed) | Lab | `120_000` (2min) — finalized, won't change |
| Medication catalog | Pharmacy | `3_600_000` (1hr) — reference data |
| ICD-10 / diagnosis codes | Catalog | `3_600_000` (1hr) — reference data |

---

## 9. Mutation Pattern

All mutations go through TanStack Query's `useMutation` calling a REST endpoint via the generated API client. There are no server actions.

### Standard Pattern

```
Component
  └── useMutation (custom hook wrapping generated hook)
        └── Generated API client function (orval)
              └── axiosInstance (adds auth header)
                    └── API Gateway
                          └── Backend NestJS Service
```

### Do Not Use Optimistic Updates for Clinical Mutations

Optimistic updates are appropriate for low-stakes UI interactions (marking a notification read, toggling a preference). For clinical operations — dispensing, prescribing, stock adjustments — **do not use optimistic updates**. If the mutation fails and rolls back, a pharmacist might hand over medication based on a UI state that was never confirmed by the server.

Instead, show a `isPending` state and block further interaction until the server responds:

```tsx
// Clinical mutation: show pending, block interaction
function DispenseButton({ id }: { id: string }) {
  const { mutate, isPending } = useDispensePrescription();
  return (
    <Button onClick={() => mutate({ id })} disabled={isPending}>
      {isPending ? <Spinner /> : 'Dispense'}
    </Button>
  );
}

// Low-stakes: optimistic update is fine
function MarkNotificationRead({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { mutate } = useMarkNotificationRead({
    onMutate: async () => {
      // optimistic update: safe, no clinical impact
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueryData(['notifications'], (old) =>
        old?.map(n => n.id === id ? { ...n, read: true } : n)
      );
    },
  });
  return <button onClick={() => mutate({ id })}>Mark read</button>;
}
```

---

## 10. Eventual Consistency and Polling

The message broker means some backend operations are **asynchronous**. For example: a doctor creates a prescription in the prescription service → the message broker notifies the pharmacy service → the pharmacy service creates a local record. There is a window between the doctor's action and the pharmacy frontend seeing the new prescription.

### Identifying Async Operations

NestJS services should return a consistent response shape for accepted-but-not-yet-complete operations:

```typescript
// NestJS response for async operations
{
  "status": "accepted",
  "correlationId": "evt_abc123",
  "message": "Prescription received and queued for pharmacy processing."
}
```

vs. synchronous completion:

```typescript
{
  "status": "completed",
  "data": { ...prescription }
}
```

### Frontend Handling

```typescript
// src/hooks/useCreatePrescription.ts

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return usePostPrescriptions({
    onSuccess: (response) => {
      if (response.status === 'accepted') {
        // Async — show a "processing" state, don't assume it's done
        toast.info('Prescription sent to pharmacy. It will appear shortly.');
        // Start polling the prescriptions list so it appears when ready
        queryClient.invalidateQueries({ queryKey: getGetPrescriptionsQueryKey() });
      } else {
        toast.success('Prescription created.');
        queryClient.invalidateQueries({ queryKey: getGetPrescriptionsQueryKey() });
      }
    },
  });
}
```

### Polling Strategy

Since real-time is handled by polling (no WebSockets for now), configure `refetchInterval` on queries that receive async updates:

```typescript
// Queues and lists that receive async updates should poll
export function usePendingPrescriptions() {
  return useGetPrescriptions(
    { status: 'pending' },
    {
      staleTime: 0,
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
    }
  );
}

// Detail views don't need to poll unless a specific status is in-flight
export function usePrescription(id: string, opts?: { pollWhileProcessing?: boolean }) {
  return useGetPrescriptionsId(id, {
    staleTime: 15_000,
    refetchInterval: opts?.pollWhileProcessing ? 5_000 : false,
  });
}
```

Usage — poll an individual record while it's in a transitional state:

```tsx
function PrescriptionDetail({ id }: { id: string }) {
  const { data } = usePrescription(id, {
    pollWhileProcessing: data?.status === 'processing',
  });
  // Automatically stops polling once status leaves 'processing'
}
```

### Showing Eventual Consistency in the UI

For operations that involve the message broker, don't leave users wondering if their action worked:

```tsx
function AsyncOperationFeedback({ status }: { status: 'pending' | 'processing' | 'completed' }) {
  if (status === 'processing') {
    return (
      <Banner variant="info">
        This prescription is being processed. The page will update automatically.
      </Banner>
    );
  }
  return null;
}
```

---

## 11. Error Handling

### Error Types

```typescript
// src/lib/api/errors.ts

export interface ApiError {
  status: number;
  code: string;       // machine-readable, from NestJS exception filter
  message: string;    // human-readable
  details?: Record<string, string[]>; // field-level validation errors
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'status' in error && 'code' in error;
}
```

Standardize NestJS exception filter output so every error matches this shape:

```typescript
// NestJS: global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json({
        status,
        code: typeof body === 'object' ? (body as any).error ?? 'HTTP_ERROR' : 'HTTP_ERROR',
        message: typeof body === 'object' ? (body as any).message : body,
        details: typeof body === 'object' ? (body as any).details : undefined,
      });
    }
  }
}
```

### Error Handling Layers

| Error type | Where it's handled | UX |
|---|---|---|
| 401 Unauthorized | `axiosInstance` interceptor | Redirect to `/login?session_expired=true` |
| 403 Forbidden | Component `isError` check | "You don't have permission for this action" |
| 422 Validation (NestJS) | Mutation `onError` | Per-field toast messages from `error.details` |
| 404 Not Found | Component `isError` + status check | Inline "Not found" state |
| 5xx Server Error | TanStack Query retry → error state | "Something went wrong, try again" with retry button |
| Network failure | TanStack Query retry (×2) → error state | Same as 5xx |

### Error State Component

```tsx
// src/components/ui/QueryErrorState.tsx

import { isApiError } from '@/lib/api/errors';

export function QueryErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = isApiError(error)
    ? error.status === 403
      ? 'You do not have permission to view this.'
      : error.message
    : 'An unexpected error occurred.';

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
      <AlertCircle className="h-8 w-8" />
      <p>{message}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
```

```tsx
// Usage
const { data, isError, error, refetch } = useGetPrescriptions(filters);
if (isError) return <QueryErrorState error={error} onRetry={refetch} />;
```

### Validation Error Display

NestJS class-validator errors come back as field-level `details`. Show them inline:

```typescript
// src/hooks/useFormMutationError.ts

import { isApiError } from '@/lib/api/errors';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';
import { toast } from 'sonner';

export function handleMutationError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
) {
  if (!isApiError(error)) {
    toast.error('An unexpected error occurred.');
    return;
  }

  if (error.details) {
    // Map NestJS field errors to react-hook-form field errors
    Object.entries(error.details).forEach(([field, messages]) => {
      setError(field as Path<T>, { message: messages[0] });
    });
  } else {
    toast.error(error.message);
  }
}
```

---

## 12. Per-Frontend Configuration

Each frontend is its own repository. They all use the same patterns but configure them independently.

### Directory Structure (Per Frontend)

```
apps/pharmacy/
  src/
    api/
      generated/           # generated by orval — do not edit manually
        pharmacy/
        patients/
    hooks/
      generated/           # generated TanStack Query hooks — do not edit manually
      usePendingPrescriptions.ts   # custom hooks on top of generated
      useDispensePrescription.ts
      usePatientPrescriptionView.ts
    types/
      generated/           # generated TypeScript types — do not edit manually
    lib/
      api/
        axios-instance.ts  # custom axios instance (auth, interceptors)
        errors.ts
      auth/
        tokens.ts
    providers/
      QueryProvider.tsx
    contexts/
      AuthContext.tsx
  orval.config.ts
```

### Orval Config Per Frontend

Each frontend's `orval.config.ts` points only at the services it uses:

```typescript
// apps/pharmacy/orval.config.ts
export default defineConfig({
  pharmacy:      { input: `${GATEWAY}/pharmacy/api-spec`, ... },
  prescriptions: { input: `${GATEWAY}/prescriptions/api-spec`, ... },
  patients:      { input: `${GATEWAY}/patients/api-spec`, ... },
});

// apps/doctor/orval.config.ts
export default defineConfig({
  encounters:    { input: `${GATEWAY}/encounters/api-spec`, ... },
  prescriptions: { input: `${GATEWAY}/prescriptions/api-spec`, ... },
  patients:      { input: `${GATEWAY}/patients/api-spec`, ... },
  labOrders:     { input: `${GATEWAY}/lab/api-spec`, ... },
});

// apps/lab/orval.config.ts
export default defineConfig({
  lab:      { input: `${GATEWAY}/lab/api-spec`, ... },
  patients: { input: `${GATEWAY}/patients/api-spec`, ... },
});
```

### Per-Frontend TanStack Query Defaults

Different frontends have different data freshness requirements. Override defaults in each `QueryProvider`:

```typescript
// curo-pharmacy: dispensing and stock data is time-sensitive
defaultOptions: {
  queries: { staleTime: 15_000, refetchOnWindowFocus: true }
}

// curo-patient: patient portal, data changes slowly
defaultOptions: {
  queries: { staleTime: 5 * 60_000, refetchOnWindowFocus: false }
}

// curo-lab: results arrive asynchronously, poll aggressively
defaultOptions: {
  queries: { staleTime: 10_000, refetchOnWindowFocus: true }
}
```

### Environment Variables (Per Frontend)

```bash
# .env.local
NEXT_PUBLIC_GATEWAY_URL=https://api.curomd.com   # or https://gateway-dev.curomd.com
```

This is the **only** URL the frontend needs to know. All service routing is handled by the gateway.

---

## Summary

| Concern | Solution |
|---|---|
| Type sharing (no monorepo) | OpenAPI specs from NestJS + `orval` codegen |
| API client | Single `axiosInstance` with auth interceptors |
| Data fetching | Orval-generated TanStack Query hooks |
| Complex/cross-service hooks | Hand-written hooks on top of generated |
| Mutations | `useMutation` → generated mutation hook → REST endpoint |
| Server actions | Not used |
| Cross-service data | Parallel TanStack Query hooks; BFF endpoint for repeated patterns |
| Filter/search state | URL search params via `nuqs` |
| Real-time (interim) | `refetchInterval` on time-sensitive queries |
| Eventual consistency | `accepted` response shape + polling on transitional states |
| Auth | JWT in `sessionStorage` (access) + `httpOnly` cookie (refresh) |
| Token refresh | Axios interceptor with request queue |
| Error handling | `ApiError` type + per-layer handling + field-level toast errors |
| Business logic | Lives in NestJS services — frontend trusts API responses |

# Repository & Domain Service Pattern

Recommended data fetching and API integration architecture for the curo-pharmacy EMR dashboard. Covers the full four-layer stack from transport to UI, the transition path from JSON files to a real backend, and EMR-specific concerns.

---

## Overview

The current setup is a functional ad-hoc API layer — flat async functions in `api.ts`, server-component-first data fetching, and client-side `useState`/`useMemo` filtering. This works for JSON files but won't scale cleanly to a real backend. The transition will expose gaps: no caching, no optimistic updates, no mutation handling, duplicated loading/error logic, and business rules scattered across components.

The recommended architecture is a **four-layer stack**:

```
UI Components (React)
      ↕ TanStack Query hooks (client) / direct calls (server)
Domain Service Layer (business logic)
      ↕
Repository Layer (data access abstraction)
      ↕
API Client / Transport (HTTP, WebSocket, etc.)
```

---

## Layer 1: API Client (Transport Layer)

A single configured HTTP client that handles auth headers, base URL, error normalization, and token refresh.

```ts
// src/lib/api/client.ts

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken(); // from cookie or memory
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? res.statusText, body.details);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get:   <T>(path: string, init?: RequestInit) => apiFetch<T>(path, { ...init, method: 'GET' }),
  post:  <T>(path: string, body: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),
  del:   <T>(path: string, init?: RequestInit) => apiFetch<T>(path, { ...init, method: 'DELETE' }),
};
```

**Why this matters for EMR:** Centralizing auth token injection means you never accidentally send unauthenticated clinical data requests. `ApiError` with structured `code` fields lets you handle clinical-specific error codes (e.g. `DRUG_INTERACTION_DETECTED`, `STOCK_INSUFFICIENT`) distinctly in the UI.

---

## Layer 2: Repository Layer (Data Access Abstraction)

One class per domain entity. Each repository owns all the ways to fetch or mutate that entity. This layer makes the codebase **backend-agnostic** — swap the implementation without touching a single component.

```ts
// src/lib/repositories/PrescriptionRepository.ts

import type { Prescription, PrescriptionStatus } from '@/types';
import { apiClient } from '@/lib/api/client';

export interface PrescriptionFilters {
  status?: PrescriptionStatus;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const PrescriptionRepository = {
  findAll(filters?: PrescriptionFilters): Promise<PaginatedResult<Prescription>> {
    const params = new URLSearchParams(
      Object.entries(filters ?? {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    return apiClient.get(`/prescriptions?${params}`);
  },

  findById(id: string): Promise<Prescription> {
    return apiClient.get(`/prescriptions/${id}`);
  },

  findByPatient(patientId: string): Promise<Prescription[]> {
    return apiClient.get(`/prescriptions?patientId=${patientId}&pageSize=100`)
      .then(r => (r as PaginatedResult<Prescription>).data);
  },

  updateStatus(id: string, status: PrescriptionStatus, notes?: string): Promise<Prescription> {
    return apiClient.patch(`/prescriptions/${id}/status`, { status, notes });
  },
};
```

**Key conventions:**
- Methods named by **what**, not **how** (`findByPatient`, not `getPrescriptionsByPatientId`)
- Filters passed as backend query params — **not** client-side JS filtering (critical for performance at scale)
- Mutations return the updated entity so you can update the cache without a refetch
- All repositories in `src/lib/repositories/`

---

## Layer 3: Domain Service Layer (Business Logic)

Where EMR-specific rules live. Not in components, not in repositories.

```ts
// src/lib/services/DispensingService.ts

import { PrescriptionRepository } from '@/lib/repositories/PrescriptionRepository';
import { MedicationRepository } from '@/lib/repositories/MedicationRepository';
import { DispensingRepository } from '@/lib/repositories/DispensingRepository';
import type { Prescription, DispensingRecord } from '@/types';

export class DispensingError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'DispensingError';
  }
}

export const DispensingService = {
  async validateForDispensing(prescriptionId: string): Promise<{
    prescription: Prescription;
    warnings: string[];
  }> {
    const prescription = await PrescriptionRepository.findById(prescriptionId);
    const warnings: string[] = [];

    if (prescription.status === 'dispensed') {
      throw new DispensingError('ALREADY_DISPENSED', 'This prescription has already been fully dispensed.');
    }

    if (prescription.status === 'cancelled' || prescription.status === 'expired') {
      throw new DispensingError('INVALID_STATUS', `Cannot dispense a ${prescription.status} prescription.`);
    }

    for (const item of prescription.items) {
      const med = await MedicationRepository.findById(item.medicationId);
      if (med.stockQuantity < item.quantityPrescribed) {
        warnings.push(
          `Insufficient stock for ${med.genericName}: ${med.stockQuantity} available, ${item.quantityPrescribed} required.`
        );
      }
      if (med.isExpiringSoon) {
        warnings.push(`${med.genericName} (Batch ${med.batchNumber}) expires soon.`);
      }
    }

    return { prescription, warnings };
  },

  async dispense(prescriptionId: string, staffId: string): Promise<DispensingRecord> {
    const { prescription } = await DispensingService.validateForDispensing(prescriptionId);
    return DispensingRepository.create({
      prescriptionId,
      patientId: prescription.patientId,
      dispensedBy: staffId,
      items: prescription.items.map(i => ({ ...i, quantityDispensed: i.quantityPrescribed })),
    });
  },
};
```

**Why this is critical for EMR:**
- Clinical rules (can't dispense cancelled prescriptions, stock checks, drug expiry warnings) live in a **single authoritative place**, not scattered across `onClick` handlers and form validators
- Services can be called from both **server actions** and **API route handlers**
- Business logic is unit-testable in isolation from HTTP and React

---

## Layer 4: TanStack Query (Client-Side State Management)

For client components, TanStack Query manages server state with caching, background refetching, and cache invalidation.

### Query Keys

Treat query keys as the "address" of each piece of server state:

```ts
// src/lib/queries/keys.ts

export const prescriptionKeys = {
  all:    () => ['prescriptions'] as const,
  lists:  () => [...prescriptionKeys.all(), 'list'] as const,
  list:   (filters: PrescriptionFilters) => [...prescriptionKeys.lists(), filters] as const,
  detail: (id: string) => [...prescriptionKeys.all(), 'detail', id] as const,
};

export const medicationKeys = {
  all:    () => ['medications'] as const,
  lists:  () => [...medicationKeys.all(), 'list'] as const,
  list:   (filters?: MedicationFilters) => [...medicationKeys.lists(), filters] as const,
  detail: (id: string) => [...medicationKeys.all(), 'detail', id] as const,
};

// ... one key factory per domain
```

### Read Hooks

```ts
// src/lib/queries/prescriptions.ts

export function usePrescriptions(filters: PrescriptionFilters) {
  return useQuery({
    queryKey: prescriptionKeys.list(filters),
    queryFn: () => PrescriptionRepository.findAll(filters),
    staleTime: 30_000,
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id),
    queryFn: () => PrescriptionRepository.findById(id),
    staleTime: 15_000,
  });
}
```

### Mutation Hook

```ts
export function useDispensePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prescriptionId, staffId }: { prescriptionId: string; staffId: string }) =>
      DispensingService.dispense(prescriptionId, staffId),

    onSuccess: (record) => {
      // Invalidate all affected caches in one place
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.detail(record.prescriptionId) });
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['dispensing-records'] });
      queryClient.invalidateQueries({ queryKey: medicationKeys.lists() }); // stock changed
    },
  });
}
```

### In a Component

```tsx
// src/components/features/prescriptions/PrescriptionTable.tsx
"use client";

export function PrescriptionTable() {
  const [filters, setFilters] = useState<PrescriptionFilters>({ page: 1 });
  const { data, isLoading, isError } = usePrescriptions(filters);

  if (isLoading) return <PrescriptionTableSkeleton />;
  if (isError) return <ErrorState message="Could not load prescriptions." />;

  return (
    <>
      <Table>
        {data.data.map(rx => <PrescriptionRow key={rx.id} prescription={rx} />)}
      </Table>
      <Pagination
        total={data.total}
        page={data.page}
        onChange={page => setFilters(f => ({ ...f, page }))}
      />
    </>
  );
}
```

**Why TanStack Query over SWR for EMR:** TanStack Query's cache invalidation model (structured query keys + `invalidateQueries`) handles the inter-domain invalidations needed here — dispensing a prescription simultaneously affects prescription status, stock levels, and dispensing log. SWR's invalidation model is less expressive for this.

---

## Layer 5: Server Actions for Mutations

For form-based mutations in the App Router, server actions keep mutation logic server-side, work without JavaScript (progressive enhancement), and integrate with `revalidatePath`/`revalidateTag`.

```ts
// src/app/(dashboard)/prescriptions/[prescriptionId]/actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { DispensingService } from '@/lib/services/DispensingService';
import { getServerSession } from '@/lib/auth/session';

export async function dispensePrescriptionAction(prescriptionId: string) {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');

  try {
    const record = await DispensingService.dispense(prescriptionId, session.userId);
    revalidateTag('prescriptions');
    revalidateTag('dispensing-records');
    revalidateTag('medication-stock');
    return { success: true, record };
  } catch (error) {
    if (error instanceof DispensingError) {
      return { success: false, error: error.message };
    }
    throw error; // Let error boundary catch unexpected errors
  }
}
```

**Server Actions vs TanStack Query mutations:**
- Use **server actions** for form submissions and simple button actions that need `revalidatePath`
- Use **TanStack Query mutations** for complex interactive flows where you need optimistic updates, multiple mutation states, or parallel coordination

---

## Transitioning from JSON to a Real Backend

The repository layer makes this transition near-zero-effort for components and services. Create an interface for each repository, implement it twice:

```ts
// src/lib/repositories/interfaces.ts
export interface IPrescriptionRepository {
  findAll(filters?: PrescriptionFilters): Promise<PaginatedResult<Prescription>>;
  findById(id: string): Promise<Prescription>;
  updateStatus(id: string, status: PrescriptionStatus, notes?: string): Promise<Prescription>;
}

// src/lib/repositories/json/PrescriptionRepository.ts  ← current (reads from /data/*.json)
// src/lib/repositories/rest/PrescriptionRepository.ts  ← future (calls apiClient)

// src/lib/repositories/index.ts
export { PrescriptionRepository } from
  process.env.DATA_SOURCE === 'rest'
    ? './rest/PrescriptionRepository'
    : './json/PrescriptionRepository';
```

Flipping `DATA_SOURCE=rest` switches every page and component to the real API without modification.

---

## Server-Side vs Client-Side Filtering

Current pattern (client-side filtering) does not scale:

| Current | Recommended |
|---|---|
| Fetch all → filter in `useMemo` | Send filter params → backend filters → receive page |
| No pagination | Server-side pagination via `page` + `pageSize` |
| Filter state in `useState` | Filter state in URL search params (shareable, back-button friendly) |

Use `nuqs` for type-safe URL search params as filter state:

```ts
import { useQueryState } from 'nuqs';

const [status, setStatus] = useQueryState('status');
const [search, setSearch] = useQueryState('search', { throttleMs: 300 });
const { data } = usePrescriptions({ status, search, page });
```

---

## EMR-Specific Concerns

### Optimistic Updates: Use With Caution

Never optimistically update dispensing records or stock levels — if the mutation rolls back, a pharmacist might hand over medication that was already dispensed. Use optimistic updates only for UI-only changes (marking notifications read, collapsing panels).

### Stale Time by Domain Criticality

```ts
// Tune staleTime based on how quickly data changes and how critical accuracy is

stock levels:        staleTime: 10_000   // changes with every dispense
prescription status: staleTime: 15_000
dispensing records:  staleTime: 30_000
patient demographics: staleTime: 300_000 // changes rarely
reports/analytics:   staleTime: 60_000
```

### Background Polling for Live Dashboards

```ts
// Poll pending prescriptions queue every 30s
useQuery({
  queryKey: prescriptionKeys.list({ status: 'pending' }),
  queryFn: () => PrescriptionRepository.findAll({ status: 'pending' }),
  refetchInterval: 30_000,
});
```

### Audit Trail in the Service Layer

Every mutation in a service should log who did what and when. Don't rely on components or repositories for this — it belongs in the service, before the repository call.

### Error Taxonomy

Handle each error type at a different level:

| Error Type | Where to Handle | UI Response |
|---|---|---|
| `ApiError` (network/HTTP) | Query `onError` / error boundary | Show retry UI |
| `DispensingError` / `ValidationError` | Mutation `onError` in component | Show specific clinical message inline |
| `AuthError` (401) | `apiClient` interceptor | Redirect to login |
| Unexpected errors | Error boundary | Generic error page |

---

## Build Order

| Priority | What | Why |
|---|---|---|
| 1 | `apiClient` transport | Foundation for everything |
| 2 | Repository interfaces + JSON implementations | Wrap current `api.ts`, establish the contract |
| 3 | Domain services (`DispensingService`, etc.) | Pull business logic out of components |
| 4 | TanStack Query setup + hooks | Replace manual loading/error state |
| 5 | URL-driven filter state (`nuqs`) | Replace `useState` filters, enable shareability |
| 6 | Server Actions for mutations | Handle form-based changes cleanly |
| 7 | REST repository implementations | Drop-in when backend is ready |

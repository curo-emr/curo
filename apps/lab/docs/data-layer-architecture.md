# CuroMD Data Layer Architecture

This document defines the data layer architecture for the CuroMD EMR platform. It covers the recommended client-side data fetching stack, API client design, migration strategy from mock data to a real backend, caching, mutations, authentication, error handling, and multi-frontend architecture.

The current project is a Next.js 16 App Router application using TypeScript, Tailwind CSS, and shadcn/ui. Data is served from static JSON files in `/data/` and accessed through `src/lib/data/api.ts`. The goal is to evolve this into a production-grade data layer that supports multiple frontends (Doctor, Patient, Lab, Pharmacy, Receptionist) all talking to a shared backend API.

---

## Table of Contents

1. [Recommended Stack: TanStack Query](#1-recommended-stack-tanstack-query)
2. [Server vs Client Data Fetching](#2-server-vs-client-data-fetching)
3. [API Client Architecture](#3-api-client-architecture)
4. [Migration Strategy from Mock Data to Real API](#4-migration-strategy-from-mock-data-to-real-api)
5. [Caching and Revalidation](#5-caching-and-revalidation)
6. [Server Actions for Mutations](#6-server-actions-for-mutations)
7. [Authentication Token Management](#7-authentication-token-management)
8. [Error Handling Patterns](#8-error-handling-patterns)
9. [Multi-Frontend Architecture](#9-multi-frontend-architecture)

---

## 1. Recommended Stack: TanStack Query

**TanStack Query (React Query) v5** is the recommended client-side data fetching and caching layer for all CuroMD frontends.

### Why TanStack Query

| Concern | TanStack Query solution |
|---|---|
| **Deduplication** | Multiple components requesting `getPatientById("p001")` in the same render cycle fire a single network request. |
| **Stale-while-revalidate** | Users see cached patient data immediately while fresh data loads in the background. Critical for EMR workflows where doctors switch between charts rapidly. |
| **Optimistic updates** | When a doctor saves SOAP notes, the UI updates instantly and rolls back if the server rejects the write. |
| **Automatic retries** | Transient network failures (common in clinic Wi-Fi environments) are retried automatically with configurable backoff. |
| **Cache invalidation** | After creating a prescription, invalidate `["prescriptions", { patientId }]` and the prescriptions tab refreshes without a full page reload. |
| **DevTools** | Built-in devtools panel shows cache state, active queries, and mutation history during development. |
| **Server integration** | `HydrationBoundary` allows Server Components to prefetch data and pass a warm cache to Client Components with zero waterfalls. |
| **Framework agnostic core** | The same query keys and fetcher functions work across all five CuroMD frontends regardless of their rendering strategy. |

### Alternatives considered and rejected

- **SWR**: Simpler API but lacks built-in mutation tracking, optimistic update rollback, and the `HydrationBoundary` pattern that integrates cleanly with Next.js App Router.
- **RTK Query**: Requires Redux as a dependency. CuroMD uses React Context for global state (see `AuthContext`, `SidebarContext`). Adding Redux solely for data fetching introduces unnecessary complexity.
- **Plain `fetch` + `useState`**: No caching, no deduplication, no retry logic. Every component that needs data must reimplement loading/error states. This does not scale across five frontends.

### Installation

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### Provider setup

Create a client-side provider that wraps the application. This goes alongside the existing `AuthProvider` in the component tree.

```tsx
// src/providers/QueryProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 30 seconds.
            // After that, background refetches happen on window focus or mount.
            staleTime: 30 * 1000,
            // Keep unused data in cache for 5 minutes before garbage collection.
            gcTime: 5 * 60 * 1000,
            // Retry failed requests up to 2 times with exponential backoff.
            retry: 2,
            // Refetch when the browser tab regains focus.
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

Add the provider to the root layout alongside `AuthProvider`:

```tsx
// src/app/layout.tsx
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="...">
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## 2. Server vs Client Data Fetching

Next.js App Router supports two fundamentally different data fetching models. CuroMD uses both, and choosing correctly is critical for performance.

### Server Components: direct data fetching (current pattern)

Server Components run on the server at request time. They can call async functions directly without any client-side data fetching library. This is the pattern already used throughout the project.

```tsx
// src/app/(dashboard)/dashboard/page.tsx (existing pattern - keep this)
import { getAppointments, getPendingLabOrders, getOpenTasks, getPatients } from "@/lib/data/api";

export default async function DashboardPage() {
  const todayStr = getTodayString();
  const appointments = await getAppointments();
  const pendingLabs = await getPendingLabOrders();
  const tasks = await getOpenTasks();
  const patients = await getPatients();

  return <DashboardUI appointments={appointments} /* ... */ />;
}
```

**When to use Server Components for data fetching:**

- Initial page load data (dashboard stats, patient list, encounter details)
- Data that does not change while the user is on the page
- SEO-relevant content (not critical for an EMR, but good practice)
- Any data fetched in `page.tsx` or `layout.tsx` files

**Advantages:** Zero client-side JavaScript for data fetching. No loading spinners on initial render. No network waterfalls. The HTML arrives fully rendered.

### Client Components: TanStack Query with hydration

Client Components run in the browser. They need a client-side data fetching library for any data that changes after initial render, responds to user interaction, or needs to be kept in sync.

The pattern uses `HydrationBoundary` to pass server-prefetched data into the TanStack Query cache so the client never sees a loading state on first render.

```tsx
// src/app/(dashboard)/schedule/page.tsx (Server Component - prefetches data)
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ScheduleView } from "@/components/features/schedule/ScheduleView";

export default async function SchedulePage() {
  const queryClient = new QueryClient();

  // Prefetch on the server. The data is serialized into the HTML.
  await queryClient.prefetchQuery({
    queryKey: ["appointments", { date: getTodayString() }],
    queryFn: () => apiClient.appointments.getByDate(getTodayString()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScheduleView />
    </HydrationBoundary>
  );
}
```

```tsx
// src/components/features/schedule/ScheduleView.tsx (Client Component - uses cached data)
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function ScheduleView() {
  const today = getTodayString();

  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ["appointments", { date: today }],
    queryFn: () => apiClient.appointments.getByDate(today),
    // Data was already prefetched on the server.
    // On subsequent navigations, this refetches in the background.
  });

  if (isLoading) return <ScheduleSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {appointments?.map((apt) => (
        <AppointmentCard key={apt.id} appointment={apt} />
      ))}
    </div>
  );
}
```

**When to use Client Components with TanStack Query:**

- Data that updates in real time (appointment status changes, lab results)
- Interactive lists with filters, search, or pagination driven by user input
- Data that changes after mutations (prescription list after creating a new prescription)
- Polling or WebSocket-driven data
- Any component that uses `useState`, `useEffect`, or event handlers

### Decision matrix

| Scenario | Fetch strategy | Reason |
|---|---|---|
| Dashboard page load | Server Component | Static view of today's stats. No interactivity needed for initial data. |
| Patient directory with search | Server prefetch + Client Query | Server provides initial list; client handles search/filter without full page reloads. |
| Encounter editor | Server prefetch catalogs + Client Query for encounter | ICD-10, medications, and lab test catalogs are prefetched. The encounter itself is fetched client-side so edits and auto-saves work. |
| Appointment status updates | Client Query with polling | Appointment statuses change throughout the day. Polling every 30s keeps the schedule current. |
| Lab results | Client Query with WebSocket | Lab results arrive asynchronously. WebSocket pushes invalidate the query cache. |

---

## 3. API Client Architecture

A centralized API client provides type-safe, consistent access to the backend from both server and client contexts.

### Directory structure

```
src/lib/
  api-client/
    index.ts          # Main apiClient export
    base.ts           # Fetch wrapper with interceptors
    endpoints/
      patients.ts     # Patient-related API calls
      appointments.ts # Appointment-related API calls
      encounters.ts   # Encounter-related API calls
      prescriptions.ts
      lab-orders.ts
      catalog.ts      # ICD-10, medications, lab tests
      tasks.ts
    types.ts          # API-specific types (error responses, pagination)
```

### Base fetch wrapper

```ts
// src/lib/api-client/base.ts
import { ApiError } from "./types";

const BASE_URLS: Record<string, string> = {
  development: "http://localhost:8000/api/v1",
  staging: "https://api.staging.curomd.com/v1",
  production: "https://api.curomd.com/v1",
};

function getBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_ENV || process.env.NODE_ENV || "development";
  return process.env.NEXT_PUBLIC_API_BASE_URL || BASE_URLS[env] || BASE_URLS.development;
}

// Token accessor. On the server this reads from cookies.
// On the client this is set by the auth provider.
let getAuthToken: (() => string | null) | null = null;

export function setAuthTokenAccessor(accessor: () => string | null) {
  getAuthToken = accessor;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: customHeaders, ...restOptions } = options;

  // Build URL with query parameters
  const url = new URL(`${getBaseUrl()}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(customHeaders as Record<string, string>),
  };

  // Inject auth token
  const token = getAuthToken?.();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    ...restOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle non-OK responses
  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }

    const apiError: ApiError = {
      status: response.status,
      code: (errorBody as { code?: string })?.code || "UNKNOWN_ERROR",
      message:
        (errorBody as { message?: string })?.message ||
        `Request failed with status ${response.status}`,
      details: (errorBody as { details?: Record<string, string[]> })?.details,
    };

    throw apiError;
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

### API-specific types

```ts
// src/lib/api-client/types.ts

/** Structured error returned by the CuroMD API. */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>; // Field-level validation errors
}

/** Standard paginated response envelope. */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Standard single-item response envelope. */
export interface SingleResponse<T> {
  data: T;
}

/** Type guard to check if an error is an ApiError. */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "code" in error &&
    "message" in error
  );
}
```

### Endpoint modules

Each endpoint module exports typed functions that use the existing interfaces from `src/types/index.ts`.

```ts
// src/lib/api-client/endpoints/patients.ts
import { apiFetch } from "../base";
import type { Patient } from "@/types";
import type { PaginatedResponse, SingleResponse } from "../types";

export const patients = {
  getAll: (params?: { page?: number; search?: string }) =>
    apiFetch<PaginatedResponse<Patient>>("/patients", { params }),

  getById: (id: string) =>
    apiFetch<SingleResponse<Patient>>(`/patients/${id}`),

  create: (data: Omit<Patient, "id" | "createdAt" | "updatedAt">) =>
    apiFetch<SingleResponse<Patient>>("/patients", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Partial<Patient>) =>
    apiFetch<SingleResponse<Patient>>(`/patients/${id}`, {
      method: "PATCH",
      body: data,
    }),
};
```

```ts
// src/lib/api-client/endpoints/appointments.ts
import { apiFetch } from "../base";
import type { Appointment } from "@/types";

export const appointments = {
  getAll: () =>
    apiFetch<{ data: Appointment[] }>("/appointments"),

  getByDate: (date: string) =>
    apiFetch<{ data: Appointment[] }>("/appointments", {
      params: { date },
    }),

  update: (id: string, data: Partial<Appointment>) =>
    apiFetch<{ data: Appointment }>(`/appointments/${id}`, {
      method: "PATCH",
      body: data,
    }),
};
```

```ts
// src/lib/api-client/endpoints/encounters.ts
import { apiFetch } from "../base";
import type { Encounter } from "@/types";

export const encounters = {
  getByPatient: (patientId: string) =>
    apiFetch<{ data: Encounter[] }>(`/patients/${patientId}/encounters`),

  getById: (id: string) =>
    apiFetch<{ data: Encounter }>(`/encounters/${id}`),

  create: (data: Omit<Encounter, "id">) =>
    apiFetch<{ data: Encounter }>("/encounters", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Partial<Encounter>) =>
    apiFetch<{ data: Encounter }>(`/encounters/${id}`, {
      method: "PATCH",
      body: data,
    }),
};
```

```ts
// src/lib/api-client/endpoints/prescriptions.ts
import { apiFetch } from "../base";
import type { Prescription } from "@/types";

export const prescriptions = {
  getByEncounter: (encounterId: string) =>
    apiFetch<{ data: Prescription[] }>(`/encounters/${encounterId}/prescriptions`),

  getByPatient: (patientId: string) =>
    apiFetch<{ data: Prescription[] }>(`/patients/${patientId}/prescriptions`),

  create: (data: Omit<Prescription, "id" | "createdAt">) =>
    apiFetch<{ data: Prescription }>("/prescriptions", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Partial<Prescription>) =>
    apiFetch<{ data: Prescription }>(`/prescriptions/${id}`, {
      method: "PATCH",
      body: data,
    }),

  sendToPharmacy: (id: string) =>
    apiFetch<{ data: Prescription }>(`/prescriptions/${id}/send`, {
      method: "POST",
    }),
};
```

```ts
// src/lib/api-client/endpoints/lab-orders.ts
import { apiFetch } from "../base";
import type { LabOrder } from "@/types";

export const labOrders = {
  getByPatient: (patientId: string) =>
    apiFetch<{ data: LabOrder[] }>(`/patients/${patientId}/lab-orders`),

  getByEncounter: (encounterId: string) =>
    apiFetch<{ data: LabOrder[] }>(`/encounters/${encounterId}/lab-orders`),

  getPending: () =>
    apiFetch<{ data: LabOrder[] }>("/lab-orders", {
      params: { status: "results_pending", reviewed: "false" },
    }),

  create: (data: Omit<LabOrder, "id" | "createdAt">) =>
    apiFetch<{ data: LabOrder }>("/lab-orders", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Partial<LabOrder>) =>
    apiFetch<{ data: LabOrder }>(`/lab-orders/${id}`, {
      method: "PATCH",
      body: data,
    }),

  markReviewed: (id: string) =>
    apiFetch<{ data: LabOrder }>(`/lab-orders/${id}/review`, {
      method: "POST",
    }),
};
```

```ts
// src/lib/api-client/endpoints/catalog.ts
import { apiFetch } from "../base";
import type { ICD10, Medication, LabTestCatalogItem } from "@/types";

export const catalog = {
  icd10: (params?: { search?: string }) =>
    apiFetch<{ data: ICD10[] }>("/catalog/icd10", { params }),

  medications: (params?: { search?: string }) =>
    apiFetch<{ data: Medication[] }>("/catalog/medications", { params }),

  labTests: () =>
    apiFetch<{ data: LabTestCatalogItem[] }>("/catalog/lab-tests"),
};
```

### Unified export

```ts
// src/lib/api-client/index.ts
import { patients } from "./endpoints/patients";
import { appointments } from "./endpoints/appointments";
import { encounters } from "./endpoints/encounters";
import { prescriptions } from "./endpoints/prescriptions";
import { labOrders } from "./endpoints/lab-orders";
import { catalog } from "./endpoints/catalog";

export { apiFetch, setAuthTokenAccessor } from "./base";
export { isApiError } from "./types";
export type { ApiError, PaginatedResponse, SingleResponse } from "./types";

export const apiClient = {
  patients,
  appointments,
  encounters,
  prescriptions,
  labOrders,
  catalog,
} as const;
```

### Query key factory

A centralized query key factory prevents key collisions and makes cache invalidation predictable across the entire application.

```ts
// src/lib/query-keys.ts

export const queryKeys = {
  patients: {
    all: ["patients"] as const,
    list: (params?: { page?: number; search?: string }) =>
      ["patients", "list", params] as const,
    detail: (id: string) => ["patients", "detail", id] as const,
  },

  appointments: {
    all: ["appointments"] as const,
    byDate: (date: string) => ["appointments", "byDate", date] as const,
  },

  encounters: {
    all: ["encounters"] as const,
    byPatient: (patientId: string) =>
      ["encounters", "byPatient", patientId] as const,
    detail: (id: string) => ["encounters", "detail", id] as const,
  },

  prescriptions: {
    byEncounter: (encounterId: string) =>
      ["prescriptions", "byEncounter", encounterId] as const,
    byPatient: (patientId: string) =>
      ["prescriptions", "byPatient", patientId] as const,
  },

  labOrders: {
    byPatient: (patientId: string) =>
      ["labOrders", "byPatient", patientId] as const,
    byEncounter: (encounterId: string) =>
      ["labOrders", "byEncounter", encounterId] as const,
    pending: ["labOrders", "pending"] as const,
  },

  catalog: {
    icd10: (search?: string) => ["catalog", "icd10", search] as const,
    medications: (search?: string) => ["catalog", "medications", search] as const,
    labTests: ["catalog", "labTests"] as const,
  },

  tasks: {
    all: ["tasks"] as const,
    open: ["tasks", "open"] as const,
  },
} as const;
```

### Custom hooks

Wrap TanStack Query calls in custom hooks. This keeps components clean and centralizes cache configuration.

```ts
// src/hooks/use-patients.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function usePatients(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: () => apiClient.patients.getAll(params),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => apiClient.patients.getById(id),
    enabled: !!id,
  });
}
```

```ts
// src/hooks/use-appointments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Appointment } from "@/types";
import { toast } from "sonner";

export function useAppointmentsByDate(date: string) {
  return useQuery({
    queryKey: queryKeys.appointments.byDate(date),
    queryFn: () => apiClient.appointments.getByDate(date),
    // Appointments change frequently during clinic hours.
    // Refetch every 30 seconds to show status updates.
    refetchInterval: 30 * 1000,
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      apiClient.appointments.update(id, data),

    onSuccess: () => {
      // Invalidate all appointment queries so they refetch.
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast.success("Appointment updated");
    },

    onError: () => {
      toast.error("Failed to update appointment");
    },
  });
}
```

```ts
// src/hooks/use-encounters.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Encounter } from "@/types";
import { toast } from "sonner";

export function useEncountersByPatient(patientId: string) {
  return useQuery({
    queryKey: queryKeys.encounters.byPatient(patientId),
    queryFn: () => apiClient.encounters.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useEncounter(id: string) {
  return useQuery({
    queryKey: queryKeys.encounters.detail(id),
    queryFn: () => apiClient.encounters.getById(id),
    enabled: !!id,
  });
}

export function useCreateEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Encounter, "id">) =>
      apiClient.encounters.create(data),

    onSuccess: (result) => {
      const encounter = result.data;
      queryClient.invalidateQueries({
        queryKey: queryKeys.encounters.byPatient(encounter.patientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all,
      });
      toast.success("Encounter created");
    },

    onError: () => {
      toast.error("Failed to create encounter");
    },
  });
}

export function useUpdateEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Encounter> }) =>
      apiClient.encounters.update(id, data),

    // Optimistic update: immediately reflect changes in the UI.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.encounters.detail(id),
      });

      const previous = queryClient.getQueryData(
        queryKeys.encounters.detail(id)
      );

      queryClient.setQueryData(
        queryKeys.encounters.detail(id),
        (old: { data: Encounter } | undefined) =>
          old ? { data: { ...old.data, ...data } } : old
      );

      return { previous };
    },

    onError: (_err, { id }, context) => {
      // Roll back to previous state on failure.
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.encounters.detail(id),
          context.previous
        );
      }
      toast.error("Failed to save encounter");
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.encounters.detail(id),
      });
    },
  });
}
```

---

## 4. Migration Strategy from Mock Data to Real API

The migration is designed to be incremental. At no point does the entire application need to change at once.

### Key insight

The current API function signatures already match what a real API layer would look like:

```ts
// Current signatures in src/lib/data/api.ts
getPatients(): Promise<Patient[]>
getPatientById(id: string): Promise<Patient | null>
getAppointmentsByDate(date: string): Promise<Appointment[]>
createEncounter(encounter: Encounter): Promise<void>
updatePrescription(updated: Prescription): Promise<void>
```

These function names, parameters, and return types are exactly what you would write for an API client. The only thing that changes is the implementation behind them.

### Phase 1: Keep the abstraction layer (current state)

`src/lib/data/api.ts` is already a clean abstraction. Server Components import functions like `getPatients()` without knowing whether data comes from JSON files or a database. No changes needed in this phase.

```
Server Component
  --> getPatients()                      (src/lib/data/api.ts)
    --> readJsonFile('patients.json')     (reads from /data/patients.json)
```

### Phase 2: Replace internals with fetch calls

Swap the `readJsonFile`/`writeJsonFile` implementations inside `src/lib/data/api.ts` to use `fetch()` calls to the real backend. The function signatures stay identical, so no consuming code changes.

```ts
// src/lib/data/api.ts - Phase 2 (updated internals)
import { apiFetch } from "@/lib/api-client/base";
import type {
  Patient, Allergy, Problem, Appointment, Encounter,
  ICD10, Medication, Prescription, LabTestCatalogItem, LabOrder, Task
} from "@/types";

// --- PATIENTS ---
export async function getPatients(): Promise<Patient[]> {
  const response = await apiFetch<{ data: Patient[] }>("/patients");
  return response.data;
}

export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const response = await apiFetch<{ data: Patient }>(`/patients/${id}`);
    return response.data;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

// --- APPOINTMENTS ---
export async function getAppointments(): Promise<Appointment[]> {
  const response = await apiFetch<{ data: Appointment[] }>("/appointments");
  return response.data;
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const response = await apiFetch<{ data: Appointment[] }>("/appointments", {
    params: { date },
  });
  return response.data;
}

export async function updateAppointment(updated: Appointment): Promise<void> {
  await apiFetch(`/appointments/${updated.id}`, {
    method: "PUT",
    body: updated,
  });
}

// --- ENCOUNTERS ---
export async function getEncountersByPatient(patientId: string): Promise<Encounter[]> {
  const response = await apiFetch<{ data: Encounter[] }>(
    `/patients/${patientId}/encounters`
  );
  return response.data;
}

export async function createEncounter(encounter: Encounter): Promise<void> {
  await apiFetch("/encounters", {
    method: "POST",
    body: encounter,
  });
}

// ... remaining functions follow the same pattern
```

This is the critical migration step. The entire application continues to work because every page still calls the same functions with the same signatures.

```
Server Component (unchanged)
  --> getPatients()                      (src/lib/data/api.ts - same signature)
    --> apiFetch('/patients')            (now hits real API instead of reading JSON)
```

### Phase 3: Add TanStack Query for interactive components

After the backend is live, introduce TanStack Query in Client Components that need real-time data, search, or mutation support. This happens component by component, not all at once.

**Before (Server Component only):**

```tsx
// src/app/(dashboard)/schedule/page.tsx
export default async function SchedulePage() {
  const appointments = await getAppointmentsByDate(getTodayString());
  return <ScheduleTable appointments={appointments} />;
}
```

**After (Server prefetch + Client Query):**

```tsx
// src/app/(dashboard)/schedule/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiClient } from "@/lib/api-client";
import { ScheduleView } from "@/components/features/schedule/ScheduleView";

export default async function SchedulePage() {
  const queryClient = new QueryClient();
  const today = getTodayString();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.appointments.byDate(today),
    queryFn: () => apiClient.appointments.getByDate(today),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScheduleView initialDate={today} />
    </HydrationBoundary>
  );
}
```

```tsx
// src/components/features/schedule/ScheduleView.tsx
"use client";

import { useAppointmentsByDate, useUpdateAppointment } from "@/hooks/use-appointments";

export function ScheduleView({ initialDate }: { initialDate: string }) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const { data, isLoading } = useAppointmentsByDate(selectedDate);
  const updateAppointment = useUpdateAppointment();

  const handleStatusChange = (id: string, status: string) => {
    updateAppointment.mutate({ id, data: { status } });
  };

  // Component renders with server-prefetched data immediately.
  // When the user picks a different date, TanStack Query fetches that date's appointments.
  // Appointment status changes trigger mutations with automatic cache invalidation.
}
```

### Migration order

Migrate components in this order based on interactivity requirements:

1. **Schedule page** - Appointment statuses change throughout the day
2. **Patient chart tabs** - Doctors switch between tabs rapidly; caching prevents redundant fetches
3. **Encounter editor** - Auto-save needs mutation support
4. **Dashboard** - Polling for new appointments and tasks
5. **Patient directory** - Client-side search and pagination
6. **Lab orders** - Real-time result updates

---

## 5. Caching and Revalidation

CuroMD uses two independent caching layers. Understanding when each applies is essential.

### Layer 1: Next.js route cache (server side)

Next.js caches rendered Server Component output at the route level. When a user navigates back to a page they previously visited, Next.js can serve the cached version.

Control this with `revalidatePath` and `revalidateTag` in Server Actions:

```ts
// src/app/actions/appointment-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client/base";
import type { Appointment } from "@/types";

export async function updateAppointmentStatus(id: string, status: string) {
  await apiFetch(`/appointments/${id}`, {
    method: "PATCH",
    body: { status },
  });

  // Invalidate the dashboard page so it re-renders with the new status.
  revalidatePath("/dashboard");
  // Also invalidate the schedule page.
  revalidatePath("/schedule");
}
```

For more granular control, use `revalidateTag` with tagged fetch calls:

```ts
// In the data fetching function
export async function getAppointments(): Promise<Appointment[]> {
  const response = await fetch(`${BASE_URL}/appointments`, {
    next: { tags: ["appointments"] },
  });
  return response.json();
}

// In a Server Action after mutation
export async function updateAppointmentAction(id: string, data: Partial<Appointment>) {
  await apiFetch(`/appointments/${id}`, { method: "PATCH", body: data });
  revalidateTag("appointments");
}
```

### Layer 2: TanStack Query cache (client side)

TanStack Query caches data in memory on the client. Configure `staleTime` based on how frequently each data type changes.

```ts
// Stale time guidelines for CuroMD data types

// Catalogs: ICD-10 codes, medication list, lab test catalog.
// These change very rarely (monthly at most). Cache aggressively.
const CATALOG_STALE_TIME = 60 * 60 * 1000; // 1 hour

// Patient demographics: name, DOB, contact info.
// Changes infrequently. Safe to cache for several minutes.
const PATIENT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Appointments and schedule: changes throughout the day.
// Keep stale time low and poll periodically.
const APPOINTMENT_STALE_TIME = 30 * 1000; // 30 seconds

// Encounters: the active encounter changes constantly during a visit.
// The completed encounter list is relatively stable.
const ENCOUNTER_LIST_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const ACTIVE_ENCOUNTER_STALE_TIME = 10 * 1000; // 10 seconds

// Lab orders: results arrive asynchronously.
// For active orders, use a short stale time or WebSocket.
const LAB_ORDER_STALE_TIME = 60 * 1000; // 1 minute
```

Apply these in the custom hooks:

```ts
// src/hooks/use-catalog.ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const ONE_HOUR = 60 * 60 * 1000;

export function useICD10Catalog(search?: string) {
  return useQuery({
    queryKey: queryKeys.catalog.icd10(search),
    queryFn: () => apiClient.catalog.icd10({ search }),
    staleTime: ONE_HOUR,
    // Keep catalog data in cache even when the component unmounts.
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useMedicationCatalog(search?: string) {
  return useQuery({
    queryKey: queryKeys.catalog.medications(search),
    queryFn: () => apiClient.catalog.medications({ search }),
    staleTime: ONE_HOUR,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
```

### Real-time data with WebSockets

Certain data in an EMR demands real-time updates. Polling works for appointments, but lab results and inter-provider messaging benefit from push notifications.

Pattern: WebSocket events invalidate TanStack Query cache entries.

```ts
// src/lib/websocket.ts
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface WSMessage {
  type: "lab_result_ready" | "appointment_status_changed" | "new_task";
  payload: {
    patientId?: string;
    appointmentId?: string;
    labOrderId?: string;
    date?: string;
  };
}

export function connectWebSocket(queryClient: QueryClient, token: string) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://api.curomd.com/ws";
  const ws = new WebSocket(`${wsUrl}?token=${token}`);

  ws.onmessage = (event) => {
    const message: WSMessage = JSON.parse(event.data);

    switch (message.type) {
      case "lab_result_ready":
        // Invalidate lab order queries for this patient.
        if (message.payload.patientId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.labOrders.byPatient(message.payload.patientId),
          });
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.labOrders.pending,
        });
        break;

      case "appointment_status_changed":
        // Invalidate the schedule for the relevant date.
        if (message.payload.date) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments.byDate(message.payload.date),
          });
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.all,
        });
        break;

      case "new_task":
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.open,
        });
        break;
    }
  };

  ws.onclose = () => {
    // Reconnect with exponential backoff.
    setTimeout(() => connectWebSocket(queryClient, token), 3000);
  };

  return ws;
}
```

Initialize the WebSocket connection in the `QueryProvider` after auth is established:

```tsx
// In QueryProvider.tsx, after user is authenticated
useEffect(() => {
  if (token) {
    const ws = connectWebSocket(queryClient, token);
    return () => ws.close();
  }
}, [token, queryClient]);
```

---

## 6. Server Actions for Mutations

Next.js Server Actions run on the server and can be called directly from Client Components. They are the recommended pattern for form submissions and write operations in CuroMD.

### Why Server Actions

- They run server-side, so auth tokens are read from `httpOnly` cookies (never exposed to the client)
- They can call `revalidatePath`/`revalidateTag` to refresh Server Component data after writes
- They work without JavaScript enabled (progressive enhancement)
- They integrate with `react-hook-form` (already a project dependency) through the `useActionState` or direct form submission patterns

### Server Action examples

```ts
// src/app/actions/encounter-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api-client/base";
import type { Encounter, SOAP, Vitals, Diagnosis } from "@/types";

// Helper to get auth token from cookies on the server.
async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("curomd_token")?.value;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

export async function createEncounterAction(data: {
  patientId: string;
  appointmentId: string;
  chiefComplaint: string;
}) {
  const token = await getServerToken();

  const encounter = await apiFetch<{ data: Encounter }>("/encounters", {
    method: "POST",
    body: {
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      chiefComplaint: data.chiefComplaint,
      status: "in_progress",
      startedAt: new Date().toISOString(),
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  revalidatePath(`/patients/${data.patientId}`);
  revalidatePath("/dashboard");

  return { encounterId: encounter.data.id };
}

export async function saveEncounterSOAPAction(
  encounterId: string,
  soap: SOAP
) {
  const token = await getServerToken();

  await apiFetch(`/encounters/${encounterId}`, {
    method: "PATCH",
    body: { soap },
    headers: { Authorization: `Bearer ${token}` },
  });

  // No revalidation needed; the encounter editor uses TanStack Query
  // and will handle its own cache update via the mutation hook.
  return { success: true };
}

export async function completeEncounterAction(
  encounterId: string,
  patientId: string,
  data: {
    soap: SOAP;
    vitals: Partial<Vitals>;
    diagnoses: Diagnosis[];
  }
) {
  const token = await getServerToken();

  await apiFetch(`/encounters/${encounterId}`, {
    method: "PATCH",
    body: {
      ...data,
      status: "completed",
      endedAt: new Date().toISOString(),
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/dashboard");

  return { success: true };
}
```

```ts
// src/app/actions/prescription-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api-client/base";
import type { Prescription, PrescriptionItem } from "@/types";

async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("curomd_token")?.value;
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function createPrescriptionAction(data: {
  patientId: string;
  encounterId: string;
  items: PrescriptionItem[];
  notesToPharmacy: string;
}) {
  const token = await getServerToken();

  const result = await apiFetch<{ data: Prescription }>("/prescriptions", {
    method: "POST",
    body: {
      patientId: data.patientId,
      encounterId: data.encounterId,
      status: "draft",
      items: data.items,
      notesToPharmacy: data.notesToPharmacy,
    },
    headers: { Authorization: `Bearer ${token}` },
  });

  revalidatePath(`/patients/${data.patientId}`);

  return { prescriptionId: result.data.id };
}

export async function sendPrescriptionToPharmacyAction(
  prescriptionId: string,
  patientId: string
) {
  const token = await getServerToken();

  await apiFetch(`/prescriptions/${prescriptionId}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  revalidatePath(`/patients/${patientId}`);

  return { success: true };
}
```

### Using Server Actions with TanStack Query mutations

Server Actions and TanStack Query mutations are complementary. Use Server Actions as the `mutationFn` inside a `useMutation` call to get optimistic updates and cache invalidation on the client, plus path revalidation on the server.

```tsx
// src/hooks/use-prescription-mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createPrescriptionAction,
  sendPrescriptionToPharmacyAction,
} from "@/app/actions/prescription-actions";
import type { PrescriptionItem } from "@/types";
import { toast } from "sonner";

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      patientId: string;
      encounterId: string;
      items: PrescriptionItem[];
      notesToPharmacy: string;
    }) => createPrescriptionAction(data),

    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.prescriptions.byEncounter(variables.encounterId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.prescriptions.byPatient(variables.patientId),
      });
      toast.success("Prescription created");
    },

    onError: () => {
      toast.error("Failed to create prescription");
    },
  });
}

export function useSendToPharmacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      prescriptionId,
      patientId,
    }: {
      prescriptionId: string;
      patientId: string;
    }) => sendPrescriptionToPharmacyAction(prescriptionId, patientId),

    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.prescriptions.byPatient(variables.patientId),
      });
      toast.success("Prescription sent to pharmacy");
    },

    onError: () => {
      toast.error("Failed to send prescription");
    },
  });
}
```

---

## 7. Authentication Token Management

The current auth implementation in `src/contexts/AuthContext.tsx` uses `localStorage` for session persistence. This is fine for a mock login but must change for production.

### Token storage: httpOnly cookies

JWT tokens must be stored in `httpOnly` cookies. This prevents XSS attacks from reading the token.

```
Client (browser)                    Server (Next.js API route / middleware)
  |                                   |
  |-- POST /api/auth/login ---------> |
  |    { email, password }            |
  |                                   |-- POST backend /auth/login
  |                                   |<-- { accessToken, refreshToken }
  |                                   |
  |<-- Set-Cookie: curomd_token=...   |  (httpOnly, Secure, SameSite=Strict)
  |    Set-Cookie: curomd_refresh=... |  (httpOnly, Secure, SameSite=Strict)
  |    Body: { user }                 |
  |                                   |
```

### Login API route

```ts
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api-client/base";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const result = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: {
        email: body.email,
        password: body.password,
      },
    });

    const response = NextResponse.json({ user: result.user });

    // Set httpOnly cookies for tokens.
    response.cookies.set("curomd_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    response.cookies.set("curomd_refresh", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status: number }).status
        : 500;
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : "Login failed";

    return NextResponse.json({ error: message }, { status });
  }
}
```

### Token refresh strategy

The access token is short-lived (15 minutes). A middleware intercepts requests, checks expiry, and refreshes the token automatically.

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Routes that do not require authentication.
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/api/auth/login"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isTokenExpiringSoon(token: string): boolean {
  try {
    // Decode JWT payload (base64url) without verifying signature.
    // Signature verification happens on the backend.
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    // Refresh if less than 2 minutes remaining.
    return expiresAt - now < 2 * 60 * 1000;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("curomd_token")?.value;
  const refreshToken = request.cookies.get("curomd_refresh")?.value;

  // No token at all: redirect to login.
  if (!token && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists but is about to expire: refresh it.
  if (token && isTokenExpiringSoon(token) && refreshToken) {
    try {
      const refreshResponse = await fetch(
        `${process.env.API_BASE_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (refreshResponse.ok) {
        const { accessToken, refreshToken: newRefreshToken } =
          await refreshResponse.json();

        const response = NextResponse.next();

        response.cookies.set("curomd_token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 15 * 60,
          path: "/",
        });

        if (newRefreshToken) {
          response.cookies.set("curomd_refresh", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          });
        }

        return response;
      }
    } catch {
      // Refresh failed. Let the request proceed with the existing token.
      // If the token is truly expired, the API will return 401 and the
      // client-side error handler will redirect to login.
    }
  }

  // No token but refresh token exists: attempt refresh.
  if (!token && refreshToken) {
    try {
      const refreshResponse = await fetch(
        `${process.env.API_BASE_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (refreshResponse.ok) {
        const { accessToken, refreshToken: newRefreshToken } =
          await refreshResponse.json();

        const response = NextResponse.next();
        response.cookies.set("curomd_token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 15 * 60,
          path: "/",
        });
        if (newRefreshToken) {
          response.cookies.set("curomd_refresh", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          });
        }
        return response;
      }
    } catch {
      // Refresh failed.
    }

    // Could not refresh. Redirect to login.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Updated AuthContext (production version)

Replace the `localStorage`-based auth with a cookie-aware version:

```tsx
// src/contexts/AuthContext.tsx (production version)
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "patient" | "lab_tech" | "pharmacist" | "receptionist";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check current session on mount.
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // Not authenticated.
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await res.json();
    setUser(data.user);
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### Reading tokens on the server for API calls

In Server Actions and Route Handlers, read the token from cookies:

```ts
import { cookies } from "next/headers";

async function getServerToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("curomd_token")?.value;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}
```

For the client-side `apiClient`, the token is sent automatically because `fetch` includes cookies by default when calling same-origin API routes. For cross-origin API calls, set `credentials: "include"` in the base fetch wrapper.

---

## 8. Error Handling Patterns

### Typed API error responses

Every error from the backend follows a consistent shape. The `ApiError` interface (defined in Section 3) is the contract.

```ts
// Example error response from the API:
// {
//   "status": 422,
//   "code": "VALIDATION_ERROR",
//   "message": "Invalid encounter data",
//   "details": {
//     "chiefComplaint": ["Chief complaint is required"],
//     "soap.subjective": ["Subjective field cannot be empty"]
//   }
// }
```

### Error boundaries at route level

The project already has `error.tsx` at the dashboard route level. This catches rendering errors in Server Components and provides a "Try Again" button. Keep this pattern and add error boundaries at more granular route levels as needed.

```
src/app/(dashboard)/
  error.tsx                              # Catches all dashboard errors (already exists)
  patients/
    error.tsx                            # Patient-specific errors (add)
    [patientId]/
      error.tsx                          # Individual patient chart errors (add)
      encounters/
        [encounterId]/
          error.tsx                      # Encounter-specific errors (add)
```

Each `error.tsx` follows the same pattern as the existing one:

```tsx
// src/app/(dashboard)/patients/[patientId]/error.tsx
"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function PatientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 p-4 rounded-full mb-6">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Could not load patient chart
      </h2>
      <p className="text-slate-500 mb-6 max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700">
        Try Again
      </Button>
    </div>
  );
}
```

### TanStack Query error and retry configuration

```ts
// Global defaults (in QueryProvider)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Do not retry on 4xx errors (client errors).
        if (isApiError(error) && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors and network failures.
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      // Do not retry mutations by default.
      // A failed prescription create should not be retried automatically.
      retry: false,
    },
  },
});
```

### Global error handler for 401 responses

When any API call returns 401 (unauthorized), redirect to the login page.

```ts
// src/lib/api-client/base.ts (addition to the fetch wrapper)

// Inside the apiFetch function, after checking response.ok:
if (response.status === 401) {
  // On the client, redirect to login.
  if (typeof window !== "undefined") {
    window.location.href = "/login?session_expired=true";
    // Throw to prevent further processing.
    throw {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Session expired. Please log in again.",
    } satisfies ApiError;
  }
  // On the server, throw so the Server Component error boundary catches it.
  throw {
    status: 401,
    code: "UNAUTHORIZED",
    message: "Not authenticated",
  } satisfies ApiError;
}
```

### User-facing error messages via toast

Mutation errors are shown to the user using `sonner` toasts (already installed):

```tsx
// In mutation hooks (shown in previous sections)
import { toast } from "sonner";
import { isApiError } from "@/lib/api-client";

export function useCreateEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Encounter, "id">) =>
      apiClient.encounters.create(data),

    onError: (error) => {
      if (isApiError(error)) {
        // Show the API error message.
        toast.error(error.message);

        // If there are field-level validation errors, show them.
        if (error.details) {
          Object.entries(error.details).forEach(([field, messages]) => {
            messages.forEach((msg) => {
              toast.error(`${field}: ${msg}`);
            });
          });
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.encounters.all,
      });
      toast.success("Encounter created successfully");
    },
  });
}
```

### Error handling summary

| Error type | Handling mechanism | User experience |
|---|---|---|
| Server Component data fetch failure | `error.tsx` boundary | Full-page error with "Try Again" button |
| Client Component query failure | TanStack Query `error` state | Inline error message with retry |
| Mutation failure (validation) | `onError` callback + toast | Toast with field-level error details |
| Mutation failure (network) | TanStack Query retry (disabled by default for mutations) | Toast with generic error message |
| 401 Unauthorized | Global handler in `apiFetch` | Redirect to login page |
| 403 Forbidden | `isApiError` check in component | "You do not have permission" message |
| Network timeout | TanStack Query retry with backoff | Automatic retry, then error state |

---

## 9. Multi-Frontend Architecture

CuroMD consists of five frontends sharing a common backend:

| Frontend | Repo | Primary users |
|---|---|---|
| `curo-doctor` | This repo | Physicians, specialists |
| `curo-patient` | Separate repo | Patients (portal) |
| `curo-lab` | Separate repo | Lab technicians |
| `curo-pharmacy` | Separate repo | Pharmacists |
| `curo-receptionist` | Separate repo | Front desk staff |

### Monorepo structure with shared packages

Use a monorepo (Turborepo recommended) to share code across frontends:

```
curomd/
  apps/
    doctor/           # Current curo-doctor app (Next.js)
    patient/          # Patient portal (Next.js)
    lab/              # Lab dashboard (Next.js)
    pharmacy/         # Pharmacy dashboard (Next.js)
    receptionist/     # Receptionist dashboard (Next.js)
  packages/
    types/            # Shared TypeScript interfaces
    api-client/       # Shared API client (apiFetch, endpoint modules)
    query-keys/       # Shared query key factory
    auth/             # Shared auth utilities
    ui/               # Shared UI components (optional, shadcn/ui based)
```

### Shared types package

Extract `src/types/index.ts` into a shared package. All frontends import from the same types, ensuring consistency.

```
packages/types/
  src/
    index.ts          # Re-exports everything
    patient.ts        # Patient, Name, Address, EmergencyContact
    appointment.ts    # Appointment
    encounter.ts      # Encounter, SOAP, Vitals, Diagnosis
    prescription.ts   # Prescription, PrescriptionItem
    lab-order.ts      # LabOrder, LabOrderTest, LabOrderReview
    catalog.ts        # ICD10, Medication, LabTestCatalogItem
    task.ts           # Task
    auth.ts           # User, Session, LoginRequest, LoginResponse
  package.json
  tsconfig.json
```

```json
// packages/types/package.json
{
  "name": "@curomd/types",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

Each frontend app imports types from the shared package:

```ts
// In any app
import type { Patient, Encounter, Appointment } from "@curomd/types";
```

### Shared API client package

The `apiClient` module from Section 3 moves to `packages/api-client/`. Each frontend configures its base URL and auth token accessor independently.

```ts
// packages/api-client/src/index.ts
export { apiFetch, setAuthTokenAccessor } from "./base";
export { apiClient } from "./client";
export { isApiError } from "./types";
export type { ApiError, PaginatedResponse, SingleResponse } from "./types";
```

Each frontend initializes the client in its provider:

```ts
// apps/doctor/src/providers/QueryProvider.tsx
"use client";

import { setAuthTokenAccessor } from "@curomd/api-client";

// For server-side calls, the token comes from cookies via the middleware.
// For client-side calls, cookies are sent automatically with same-origin requests.
// If using cross-origin API, set the accessor:
setAuthTokenAccessor(() => {
  // Return null; cookies are sent automatically via credentials: "include".
  return null;
});
```

### Per-frontend TanStack Query configuration

Each frontend has its own `QueryClient` with configuration tuned to its use case:

```ts
// apps/doctor/src/providers/QueryProvider.tsx
// Doctors need fast access to patient data. Use aggressive prefetching.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

// apps/patient/src/providers/QueryProvider.tsx
// Patients view their own data infrequently. Longer stale times are fine.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// apps/lab/src/providers/QueryProvider.tsx
// Lab techs need real-time order updates. Short stale times and polling.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000,
      refetchInterval: 15 * 1000,
    },
  },
});
```

### Shared auth library

Auth logic (login, logout, token refresh, role-based access) is shared:

```
packages/auth/
  src/
    index.ts
    middleware.ts     # Shared middleware logic for token validation
    hooks.ts          # useAuth hook
    types.ts          # User, Session types
    roles.ts          # Role-based permission checks
  package.json
```

```ts
// packages/auth/src/roles.ts
export type Role = "doctor" | "patient" | "lab_tech" | "pharmacist" | "receptionist";

export interface Permission {
  resource: string;
  actions: ("read" | "write" | "delete")[];
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  doctor: [
    { resource: "patients", actions: ["read", "write"] },
    { resource: "encounters", actions: ["read", "write"] },
    { resource: "prescriptions", actions: ["read", "write"] },
    { resource: "lab_orders", actions: ["read", "write"] },
    { resource: "appointments", actions: ["read", "write"] },
  ],
  patient: [
    { resource: "patients", actions: ["read"] },      // Own record only
    { resource: "encounters", actions: ["read"] },     // Own encounters only
    { resource: "prescriptions", actions: ["read"] },  // Own prescriptions only
    { resource: "lab_orders", actions: ["read"] },     // Own lab orders only
    { resource: "appointments", actions: ["read", "write"] },
  ],
  lab_tech: [
    { resource: "patients", actions: ["read"] },
    { resource: "lab_orders", actions: ["read", "write"] },
  ],
  pharmacist: [
    { resource: "patients", actions: ["read"] },
    { resource: "prescriptions", actions: ["read", "write"] },
  ],
  receptionist: [
    { resource: "patients", actions: ["read", "write"] },
    { resource: "appointments", actions: ["read", "write"] },
  ],
};

export function hasPermission(
  role: Role,
  resource: string,
  action: "read" | "write" | "delete"
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  return permissions.some(
    (p) => p.resource === resource && p.actions.includes(action)
  );
}
```

### Cross-frontend data flow

```
                            +------------------+
                            |   CuroMD API     |
                            |   (Backend)      |
                            +--------+---------+
                                     |
                    +----------------+----------------+
                    |                |                |
              +-----------+   +-----------+   +-----------+
              |  Doctor   |   |  Patient  |   |    Lab    |
              |  Frontend |   |  Portal   |   | Dashboard |
              +-----------+   +-----------+   +-----------+
                    |                |                |
              @curomd/types   @curomd/types   @curomd/types
              @curomd/api     @curomd/api     @curomd/api
              @curomd/auth    @curomd/auth    @curomd/auth
```

When a doctor sends a prescription to the pharmacy:

1. Doctor frontend calls `sendPrescriptionToPharmacyAction`
2. Backend updates prescription status to `sent_to_pharmacy`
3. Backend sends WebSocket event to the pharmacy frontend
4. Pharmacy frontend's WebSocket handler invalidates the prescription query
5. Pharmacy dashboard re-renders with the new prescription

All frontends share the same `Prescription` type from `@curomd/types`. The API response shape is identical regardless of which frontend made the request. Authorization (what data each role can access) is enforced by the backend.

---

## Summary

| Layer | Technology | Purpose |
|---|---|---|
| Server data fetching | Next.js Server Components + `async` functions | Initial page loads, zero-JS data fetching |
| Client data fetching | TanStack Query v5 | Caching, deduplication, background refetching, mutations |
| API client | Custom `apiFetch` wrapper | Typed requests, auth injection, error normalization |
| Mutations | Next.js Server Actions + TanStack Query `useMutation` | Form submissions, revalidation, optimistic updates |
| Caching (server) | Next.js route cache + `revalidatePath` / `revalidateTag` | Server-rendered page freshness |
| Caching (client) | TanStack Query stale/gc times | Per-data-type freshness configuration |
| Real-time | WebSocket events invalidating TanStack Query cache | Lab results, appointment status, tasks |
| Authentication | httpOnly cookies + JWT + middleware refresh | Secure token storage, automatic refresh |
| Error handling | Error boundaries + `ApiError` type + toast notifications | Granular, user-friendly error reporting |
| Multi-frontend | Turborepo monorepo with shared `@curomd/*` packages | Consistent types, API client, and auth across all frontends |

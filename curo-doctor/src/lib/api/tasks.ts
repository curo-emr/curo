import { apiClient } from './client';
import type { Task } from '@/types';
import { mapFhirTask, type FhirTask } from './mappers';
import { unwrapBundle, type FhirBundle } from './fhir';

export async function getTasks(): Promise<Task[]> {
  const res = await apiClient.get<FhirTask[] | FhirBundle<FhirTask>>('/tasks');
  return unwrapBundle(res.data).resources.map(mapFhirTask);
}

export async function getOpenTasks(): Promise<Task[]> {
  const res = await apiClient.get<FhirTask[] | FhirBundle<FhirTask>>('/tasks', { params: { status: 'open' } });
  return unwrapBundle(res.data).resources.map(mapFhirTask);
}

export async function createTask(data: Record<string, unknown>): Promise<Task> {
  const res = await apiClient.post<FhirTask>('/tasks', data);
  return mapFhirTask(res.data);
}

export async function updateTask(id: string, data: Record<string, unknown>): Promise<Task> {
  const res = await apiClient.put<FhirTask>(`/tasks/${id}`, data);
  return mapFhirTask(res.data);
}

import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  type: string;
  city?: string | null;
}

/** Where the signed-in user works, as their token says; null when nowhere. */
export async function getMyWorkplace(): Promise<Organization | null> {
  // An empty body means no workplace.
  const res = await apiClient.get<Organization | ''>('/organizations/mine');
  return res.data || null;
}

import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../api";

export interface Organization {
  id: string;
  name: string;
  type: string;
  city?: string | null;
}

/** Where the signed-in user works, as their token says; null when nowhere. */
export async function getMyWorkplace(): Promise<Organization | null> {
  // An empty body means no workplace.
  const res = await apiClient.get<Organization | "">("/organizations/mine");
  return res.data || null;
}

export const workplaceQueries = {
  /** It changes only when an administrator reassigns the user. */
  mine: () => queryOptions({
    queryKey: ["workplace"],
    queryFn: getMyWorkplace,
    staleTime: Infinity,
  }),
};

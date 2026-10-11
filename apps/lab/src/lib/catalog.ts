import { useQuery } from "@tanstack/react-query";
import { allOf, type Loadable } from "@curo/web/query";
import { workplaceQueries } from "@curo/web/workplace";
import { labQueries } from "@/lib/queries";
import type { LabTestCatalogItem } from "@/types";

/** The tests your lab offers, as doctors see them when they order. For `QueryContent`. */
export function useMyCatalog(): Loadable<LabTestCatalogItem[]> {
  const workplace = useQuery(workplaceQueries.mine());
  const catalog = useQuery({ ...labQueries.catalog(workplace.data?.id), enabled: workplace.isSuccess });
  const both = allOf(workplace, catalog);
  return { ...both, data: both.data?.[1] };
}

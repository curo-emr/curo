import { getLabTestCatalog } from "@/lib/data/api";
import { TestCatalogList } from "@/components/features/test-catalog/TestCatalogList";

export default async function TestCatalogPage() {
  const tests = await getLabTestCatalog();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Test Catalog</h1>
        <p className="text-sm text-muted-foreground">Browse available laboratory tests, reference ranges, and pricing</p>
      </div>

      <TestCatalogList tests={tests} />
    </div>
  );
}

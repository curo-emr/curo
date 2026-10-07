"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Pill, Search } from "lucide-react";
import { Card } from "@curo/web/ui/card";
import { Input } from "@curo/web/ui/input";
import { Skeleton } from "@curo/web/ui/skeleton";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import {
  getOrganizations, getPharmacyStock, getLabCatalog,
  type Organization, type PharmacyStockItem, type LabCatalogTest,
} from "@/lib/api/directory";

export default function DirectoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pharmacies & Labs" description="Check what a pharmacy has in stock or which tests a lab offers." />
      <Tabs defaultValue="pharmacy" className="gap-4">
        <TabsList>
          <TabsTrigger value="pharmacy" className="px-4"><Pill /> Pharmacies</TabsTrigger>
          <TabsTrigger value="lab" className="px-4"><FlaskConical /> Labs</TabsTrigger>
        </TabsList>
        <TabsContent value="pharmacy">
          <CatalogPanel<PharmacyStockItem>
            orgType="pharmacy"
            orgLabel="pharmacy"
            searchPlaceholder="Search drugs…"
            load={getPharmacyStock}
            matches={(s, q) => `${s.medicationName} ${s.genericName ?? ""}`.toLowerCase().includes(q)}
            emptyIcon={Pill}
            columns={[
              { header: "Drug", cell: s => <span className="font-medium text-foreground">{s.medicationName}</span> },
              { header: "Strength", cell: s => s.strength },
              {
                header: "Availability", cell: s => s.quantity > 0
                  ? <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-xs font-medium text-status-success-text">{s.quantity} {s.unit} in stock</span>
                  : <span className="rounded-full bg-status-error-bg px-2 py-0.5 text-xs font-medium text-status-error-text">Out of stock</span>,
              },
              { header: "Expiry", cell: s => s.expiryDate ? new Date(s.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—" },
            ]}
          />
        </TabsContent>
        <TabsContent value="lab">
          <CatalogPanel<LabCatalogTest>
            orgType="laboratory"
            orgLabel="lab"
            searchPlaceholder="Search tests…"
            load={getLabCatalog}
            matches={(t, q) => `${t.name} ${t.code}`.toLowerCase().includes(q)}
            emptyIcon={FlaskConical}
            columns={[
              { header: "Test", cell: t => <><span className="font-medium text-foreground">{t.name}</span> <span className="font-mono text-xs text-muted-foreground">{t.code}</span></> },
              { header: "Category", cell: t => t.category },
              { header: "Specimen", cell: t => t.specimen },
              { header: "Price", cell: t => (t.price != null ? `Rs. ${Number(t.price).toFixed(2)}` : "—"), align: "right" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface Column<T> {
  header: string;
  cell: (item: T) => React.ReactNode;
  align?: "right";
}

interface CatalogPanelProps<T> {
  orgType: "pharmacy" | "laboratory";
  orgLabel: string;
  searchPlaceholder: string;
  load: (orgId: string) => Promise<T[]>;
  matches: (item: T, query: string) => boolean;
  columns: Column<T>[];
  emptyIcon: typeof Pill;
}

// Pick an organisation, then browse/search its catalog.
function CatalogPanel<T extends { id: string }>({ orgType, orgLabel, searchPlaceholder, load, matches, columns, emptyIcon }: CatalogPanelProps<T>) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selected, setSelected] = useState("");
  const [items, setItems] = useState<T[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getOrganizations(orgType)
      .then(o => { setOrgs(o); if (o[0]) setSelected(o[0].id); else setItems([]); })
      .catch(() => setItems([]));
  }, [orgType]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    load(selected).then(r => { if (active) setItems(r); }).catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [selected, load]);

  const choose = (id: string) => { setItems(null); setSelected(id); };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return !items ? null : q ? items.filter(i => matches(i, q)) : items;
  }, [items, query, matches]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={selected} onValueChange={choose}>
          <SelectTrigger className="h-10 bg-card sm:w-72"><SelectValue placeholder={`Select a ${orgLabel}`} /></SelectTrigger>
          <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={searchPlaceholder} value={query} onChange={e => setQuery(e.target.value)} className="h-10 bg-card pl-9" />
        </div>
      </div>

      <Card className="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map(c => <TableHead key={c.header} className={c.align === "right" ? "pr-5 text-right" : "first:pl-5"}>{c.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered === null ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={columns.length} className="px-5"><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}><EmptyState icon={emptyIcon} title="Nothing found" /></TableCell>
              </TableRow>
            ) : (
              filtered.map(item => (
                <TableRow key={item.id}>
                  {columns.map(c => (
                    <TableCell key={c.header} className={c.align === "right" ? "pr-5 text-right text-muted-foreground" : "text-muted-foreground first:pl-5"}>
                      {c.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

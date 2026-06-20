"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Pill, FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getOrganizations, getPharmacyStock, getLabCatalog,
  type Organization, type PharmacyStockItem, type LabCatalogTest,
} from "@/lib/api/directory";

export default function DirectoryPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pharmacies &amp; Labs</h1>
        <p className="text-sm text-muted-foreground">Check a pharmacy&apos;s drug availability or a lab&apos;s available tests.</p>
      </div>
      <Tabs defaultValue="pharmacy">
        <TabsList>
          <TabsTrigger value="pharmacy"><Pill className="h-4 w-4 mr-2" />Pharmacies</TabsTrigger>
          <TabsTrigger value="lab"><FlaskConical className="h-4 w-4 mr-2" />Labs</TabsTrigger>
        </TabsList>
        <TabsContent value="pharmacy" className="mt-4"><PharmacyPanel /></TabsContent>
        <TabsContent value="lab" className="mt-4"><LabPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function PharmacyPanel() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [stock, setStock] = useState<PharmacyStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getOrganizations("pharmacy").then((o) => { setOrgs(o); if (o[0]) setSelected(o[0].id); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getPharmacyStock(selected).then(setStock).catch(console.error).finally(() => setLoading(false));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return stock;
    return stock.filter((s) => s.medicationName.toLowerCase().includes(q) || (s.genericName ?? "").toLowerCase().includes(q));
  }, [stock, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="sm:w-72"><SelectValue placeholder="Select a pharmacy" /></SelectTrigger>
          <SelectContent>{orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search drug..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 bg-muted border" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground"><tr className="text-left">
                <th className="px-4 py-2 font-medium">Drug</th><th className="px-4 py-2 font-medium">Strength</th>
                <th className="px-4 py-2 font-medium">Availability</th><th className="px-4 py-2 font-medium">Expiry</th>
              </tr></thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted-foreground py-8">No drugs found.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2 font-medium">{s.medicationName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{s.strength}</td>
                    <td className="px-4 py-2">
                      {s.quantity > 0 ? (
                        <Badge variant="outline" className="bg-status-success-bg text-status-success-text border-status-success-border"><CheckCircle2 className="h-3 w-3 mr-1" />{s.quantity} {s.unit}</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-status-error-bg text-status-error-text border-status-error-border"><XCircle className="h-3 w-3 mr-1" />Out of stock</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{s.expiryDate ? new Date(s.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LabPanel() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [tests, setTests] = useState<LabCatalogTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getOrganizations("laboratory").then((o) => { setOrgs(o); if (o[0]) setSelected(o[0].id); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getLabCatalog(selected).then(setTests).catch(console.error).finally(() => setLoading(false));
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tests;
    return tests.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }, [tests, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="sm:w-72"><SelectValue placeholder="Select a lab" /></SelectTrigger>
          <SelectContent>{orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search test..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 bg-muted border" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground"><tr className="text-left">
                <th className="px-4 py-2 font-medium">Test</th><th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Specimen</th><th className="px-4 py-2 font-medium text-right">Price</th>
              </tr></thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted-foreground py-8">No tests available.</td></tr>
                ) : filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2 font-medium">{t.name} <span className="text-xs text-muted-foreground font-mono">{t.code}</span></td>
                    <td className="px-4 py-2 text-muted-foreground">{t.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t.specimen}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{t.price != null ? `Rs. ${Number(t.price).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

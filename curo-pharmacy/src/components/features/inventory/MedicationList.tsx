"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Medication } from "@/types";
import { formatStatus, formatCurrency, isLowStock, daysUntilExpiry } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface MedicationListProps {
  medications: Medication[];
}

function getStockStatus(med: Medication): string {
  if (med.stockQuantity === 0) return 'out_of_stock';
  if (med.stockQuantity <= med.reorderLevel) return 'low_stock';
  return 'in_stock';
}

export function MedicationList({ medications }: MedicationListProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(medications.map(m => m.category));
    return Array.from(cats).sort();
  }, [medications]);

  const filtered = useMemo(() => {
    return medications.filter(m => {
      const q = query.toLowerCase().trim();
      if (q) {
        const matchesQuery =
          m.genericName.toLowerCase().includes(q) ||
          m.brandName.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.manufacturer.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (stockFilter === "low" && !isLowStock(m.stockQuantity, m.reorderLevel)) return false;
      if (stockFilter === "expiring" && !( daysUntilExpiry(m.expiryDate) <= 90 )) return false;
      return true;
    });
  }, [query, categoryFilter, stockFilter, medications]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, brand, code, or manufacturer..."
                className="pl-9 bg-muted border"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{formatStatus(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="low">Low / Out of Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {(query || categoryFilter !== "all" || stockFilter !== "all") && (
        <p className="text-sm text-muted-foreground px-1">
          {filtered.length} of {medications.length} medications shown
        </p>
      )}

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Medication</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Form / Strength</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Expiry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map(med => {
                const stockStatus = getStockStatus(med);
                const expDays = daysUntilExpiry(med.expiryDate);
                return (
                  <TableRow key={med.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{med.genericName}</p>
                        <p className="text-xs text-muted-foreground">{med.brandName} &middot; {med.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-muted-foreground">
                        {formatStatus(med.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatStatus(med.form)} &middot; {med.strength}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        med.stockQuantity === 0 ? 'text-status-error-text' :
                        isLowStock(med.stockQuantity, med.reorderLevel) ? 'text-status-warning-text' :
                        'text-foreground'
                      }`}>
                        {med.stockQuantity.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/ {med.reorderLevel}</span>
                    </TableCell>
                    <TableCell><StatusBadge status={stockStatus} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatCurrency(med.unitPrice)}</TableCell>
                    <TableCell>
                      <span className={`text-sm ${expDays <= 90 ? 'text-status-error-text font-medium' : 'text-muted-foreground'}`}>
                        {new Date(med.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        {expDays <= 90 && expDays >= 0 && (
                          <span className="block text-xs">({expDays}d left)</span>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No medications match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

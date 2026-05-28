"use client";

import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

export default function VisitDetailPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.VISITS}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visit Details</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Visit detail records are available to your care team.</p>
          <p className="text-sm text-slate-400 mt-1">Contact your clinic for a full copy of your visit notes.</p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Settings" description="Your administrator account." />
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3"><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Email: </span>{user?.email ?? "—"}</p>
          <p><span className="text-muted-foreground">Role: </span>{user?.role ?? "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

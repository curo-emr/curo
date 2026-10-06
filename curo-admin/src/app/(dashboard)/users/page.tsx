"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { UserList } from "@/components/features/users/UserList";
import { ROUTES } from "@/lib/constants";

function UsersPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  return <UserList initialQuery={initialQuery} />;
}

export default function UsersPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Users" description="Manage accounts and roles for every portal.">
        <Link href={ROUTES.NEW_USER}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </Link>
      </PageHeader>

      {/* UserList fetches its own paginated data (useSearchParams needs Suspense). */}
      <Suspense fallback={<div className="py-20 text-center text-slate-500">Loading users…</div>}>
        <UsersPageInner />
      </Suspense>
    </div>
  );
}

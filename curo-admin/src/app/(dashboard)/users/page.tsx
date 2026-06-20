"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { UserList } from "@/components/features/users/UserList";
import { getUsers } from "@/lib/api/users";
import { ROUTES } from "@/lib/constants";
import type { AdminUser } from "@/types";

export default function UsersPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Users" description="Manage accounts and roles for every portal.">
        <Link href={ROUTES.NEW_USER}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </Link>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (
        <UserList users={users} initialQuery={initialQuery} />
      )}
    </div>
  );
}

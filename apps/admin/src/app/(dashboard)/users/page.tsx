import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@curo/web/ui/page-header";
import { Button } from "@curo/web/ui/button";
import { UserList } from "@/components/features/users/UserList";
import { ROUTES } from "@/lib/constants";

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Users" description="Accounts for every portal. Reset a password from any row.">
        <Button asChild>
          <Link href={ROUTES.NEW_USER}><UserPlus /> Add user</Link>
        </Button>
      </PageHeader>
      <UserList />
    </div>
  );
}

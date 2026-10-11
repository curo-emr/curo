import { PageHeader } from "@curo/web/ui/page-header";
import { UserCreateForm } from "@/components/features/users/UserCreateForm";
import { ROUTES } from "@/lib/constants";

export default function NewUserPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Add user"
        description="A staff account for any portal."
        back={{ href: ROUTES.USERS, label: "All users" }}
      />
      <UserCreateForm />
    </div>
  );
}

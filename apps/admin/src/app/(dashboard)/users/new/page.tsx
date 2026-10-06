"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { UserCreateForm } from "@/components/features/users/UserCreateForm";

export default function NewUserPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Add User" description="Create an account for any portal role." />
      <UserCreateForm />
    </div>
  );
}

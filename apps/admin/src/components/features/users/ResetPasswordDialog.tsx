"use client";

import { PasswordDialog } from "@curo/web/ui/password";
import { resetUserPassword } from "@/lib/api/users";
import type { AdminUser } from "@/types";

interface ResetPasswordDialogProps {
  user: Pick<AdminUser, "id" | "name">;
  /** The button that opens it: filled on the user's page, quieter in a list row. */
  trigger: React.ReactNode;
}

/** A new password for someone who forgot theirs. A sign-in lockout is lifted with it. */
export function ResetPasswordDialog({ user, trigger }: ResetPasswordDialogProps) {
  return (
    <PasswordDialog
      trigger={trigger}
      title={`Reset ${user.name}'s password`}
      description="Their old password stops working straight away, and they're signed out everywhere."
      submitLabel="Reset password"
      doneTitle={`Password reset for ${user.name}`}
      save={password => resetUserPassword(user.id, password)}
    />
  );
}

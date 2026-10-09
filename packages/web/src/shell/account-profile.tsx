import { Info, LogOut, UserRound } from "lucide-react";
import { Button } from "../ui/button";
import { InitialsAvatar } from "../ui/initials-avatar";
import { SectionCard } from "../ui/section-card";
import { Skeleton } from "../ui/skeleton";

export interface AccountField {
  label: string;
  value?: string | null;
}

interface AccountProfileProps {
  name: string;
  fields: AccountField[];
  /** While the profile loads, a field with no value yet shows a placeholder. */
  loading?: boolean;
  onSignOut: () => void;
}

// The signed-in user's profile, read-only: an administrator manages accounts and passwords.
export function AccountProfile({ name, fields, loading, onSignOut }: AccountProfileProps) {
  return (
    <>
      <SectionCard icon={UserRound} title="Profile">
        <div className="flex flex-col gap-6 sm:flex-row">
          <InitialsAvatar name={name} size="xl" />
          <dl className="grid flex-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map(f => (
              <div key={f.label}>
                <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {loading && !f.value ? <Skeleton className="h-5 w-32" /> : f.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-6 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Profile details and passwords are managed by your clinic administrator. Contact them to make changes.
        </p>
      </SectionCard>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onSignOut} className="text-destructive hover:text-destructive">
          <LogOut /> Sign out
        </Button>
      </div>
    </>
  );
}

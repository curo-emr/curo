import Link from "next/link";
import { ArrowRight, Coffee } from "lucide-react";
import { cn } from "cn";
import { Button } from "./button";
import { Card } from "./card";
import { EmptyState } from "./empty-state";
import { InitialsAvatar } from "./initials-avatar";
import { Skeleton } from "./skeleton";

interface NextUpCardProps {
  /** What the card is for, e.g. "Next for triage". */
  label: string;
  /** Beside the label: wait time, queue stage, priority. */
  badges?: React.ReactNode;
  /** The patient's name; undefined while it loads. */
  name: string | undefined;
  /** Makes the name a link, usually to the patient's chart. */
  href?: string;
  /** A NextUpAction, with any secondary buttons before it. */
  action: React.ReactNode;
  /** A strip under the card, usually a NextUpSummary of who else is waiting. */
  footer?: React.ReactNode;
  /** Details under the name: age and sex, ids, time, what's ordered. */
  children?: React.ReactNode;
}

const NAME = "truncate text-xl font-semibold tracking-tight text-foreground";

// The one patient a dashboard puts first, with the screen's only primary action.
// Each portal supplies the details; the look lives here.
export function NextUpCard({ label, badges, name, href, action, footer, children }: NextUpCardProps) {
  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <InitialsAvatar name={name ?? ""} size="lg" className="bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</span>
            {badges}
          </div>
          {name === undefined ? (
            <Skeleton className="h-7 w-48" />
          ) : href ? (
            <Link href={href} className={cn(NAME, "hover:text-primary")}>{name}</Link>
          ) : (
            <p className={NAME}>{name}</p>
          )}
          {children}
        </div>
        {/* On a phone the primary action comes first, above any secondary one. */}
        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center">{action}</div>
      </div>
      {footer && <div className="border-t bg-card/60">{footer}</div>}
    </Card>
  );
}

/** The card's primary button: larger than a page's, so it reads as the next step. */
export function NextUpAction(props: Omit<React.ComponentProps<typeof Button>, "className" | "size" | "variant">) {
  return <Button size="lg" className="h-11 px-6 text-base shadow-md shadow-primary/20" {...props} />;
}

interface NextUpSummaryProps {
  /** The full list, e.g. the worklist or the queue board. */
  href: string;
  linkLabel: string;
  /** Who else is waiting. Wrap the numbers in <b>. */
  children: React.ReactNode;
}

/** The footer line: who else is waiting, and the way to the full list. */
export function NextUpSummary({ href, linkLabel, children }: NextUpSummaryProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3 text-sm">
      <p className="text-muted-foreground [&_b]:font-medium [&_b]:tabular-nums [&_b]:text-foreground">{children}</p>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
        {linkLabel} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

/** The card when no one is waiting. */
export function NextUpEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <EmptyState icon={Coffee} title={title} description={description} className="py-8" />
    </Card>
  );
}

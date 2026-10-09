import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}

/** The way back up from a nested page, e.g. "All patients". */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="h-4 w-4" /> {label}
    </Link>
  );
}

export function PageHeader({ title, description, back, children }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {back && <BackLink {...back} />}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}

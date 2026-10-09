import { type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { BrandMark } from "./brand-mark";

export interface AuthFeature {
  icon: LucideIcon;
  text: string;
}

interface AuthShellProps {
  /** Shown under the product name, e.g. "Doctor Portal". */
  portal: string;
  /** The big line on the brand panel; `accent` is its second, highlighted line. */
  headline: string;
  accent: string;
  tagline: string;
  /** Two or three things the portal actually does. */
  features: AuthFeature[];
  children: React.ReactNode;
}

// The sign-in frame every portal shares: a brand panel beside the form (above it on phones).
export function AuthShell({ portal, headline, accent, tagline, features, children }: AuthShellProps) {
  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <aside className="relative hidden h-full flex-col justify-between overflow-hidden bg-brand-ink p-12 text-brand-ink-foreground lg:flex lg:w-[44%]">
        {/* Soft light from the primary colour, top-left and bottom-right. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,color-mix(in_oklch,var(--primary)_35%,transparent),transparent_45%),radial-gradient(circle_at_100%_100%,color-mix(in_oklch,var(--primary)_25%,transparent),transparent_50%)]"
        />

        <Brand portal={portal} className="relative" inverted />

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-4xl leading-tight font-semibold tracking-tight">
              {headline}
              <br />
              <span className="text-brand-ink-foreground/60">{accent}</span>
            </h2>
            <p className="max-w-xs text-[15px] leading-relaxed text-brand-ink-foreground/60">{tagline}</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-xl border border-brand-ink-foreground/10 bg-brand-ink-foreground/5 px-4 py-3 text-sm text-brand-ink-foreground/80">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/40">
                  <Icon className="size-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-ink-foreground/40">© {new Date().getFullYear()} CuroMD</p>
      </aside>

      <main className="flex h-full flex-1 items-center justify-center overflow-y-auto bg-background p-8">
        <div className="w-full max-w-sm">
          <Brand portal={portal} className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}

function Brand({ portal, inverted, className }: { portal: string; inverted?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className="size-10 rounded-xl" />
      <div className="leading-tight">
        <p className="text-lg font-semibold tracking-tight">CuroMD</p>
        <p className={cn("text-xs", inverted ? "text-brand-ink-foreground/50" : "text-muted-foreground")}>{portal}</p>
      </div>
    </div>
  );
}

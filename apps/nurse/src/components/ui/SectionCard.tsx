import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  icon?: LucideIcon;
  iconClassName?: string;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function SectionCard({ icon: Icon, iconClassName, title, headerRight, children, noPadding, className }: SectionCardProps) {
  return (
    <Card className={cn("shadow-sm border", className)}>
      <CardHeader className="bg-muted/50 border-b pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className={cn("h-4 w-4", iconClassName)} />}
          {title}
        </CardTitle>
        {headerRight}
      </CardHeader>
      <CardContent className={noPadding ? "p-0" : "p-5"}>
        {children}
      </CardContent>
    </Card>
  );
}

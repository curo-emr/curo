"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "../ui/sidebar";
import { TooltipProvider } from "../ui/tooltip";
import { BrandMark } from "./brand-mark";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** A labelled block of links in the sidebar. The first section usually has no label. */
export interface NavSection {
  label?: string;
  items: NavItem[];
}

interface AppShellProps {
  /** Shown under the product name, e.g. "Doctor Portal". */
  portal: string;
  /** Where the brand links to: the portal's home screen. */
  home: string;
  nav: NavSection[];
  /** The sidebar footer, usually an <AccountMenu>. */
  account: React.ReactNode;
  /** The top bar's left side, after the sidebar toggle and a divider: the portal's search. */
  search?: React.ReactNode;
  /** The top bar's right side: notifications, the workplace and so on. */
  actions?: React.ReactNode;
  /** Whether the sidebar starts open; a portal's layout reads it with `sidebarStartsOpen`. Open by default. */
  sidebarOpen?: boolean;
  children: React.ReactNode;
}

// The frame every portal shares: a collapsible sidebar (a drawer on phones), a top bar
// and a scrolling content area. A portal supplies its links, account menu, search and actions.
export function AppShell({ portal, home, nav, account, search, actions, sidebarOpen, children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen} className="h-svh overflow-hidden">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild tooltip="CuroMD">
                  <Link href={home}>
                    <BrandMark />
                    <span className="flex flex-col leading-tight">
                      <span className="font-semibold text-foreground">CuroMD</span>
                      <span className="text-xs text-muted-foreground">{portal}</span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            {nav.map((section, i) => (
              <NavGroup key={section.label ?? i} section={section} />
            ))}
          </SidebarContent>
          <SidebarFooter>{account}</SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-hidden bg-surface">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
            {search && (
              <>
                <Separator orientation="vertical" className="mr-1 data-vertical:h-5 data-vertical:self-auto" />
                <div className="min-w-0 flex-1">{search}</div>
              </>
            )}
            {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
          </header>
          <div id="main" className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function NavGroup({ section }: { section: NavSection }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map(item => {
            const active = isCurrent(pathname, item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className="data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary data-[active=true]:hover:bg-sidebar-primary/15"
                >
                  <Link href={item.href} aria-current={active ? "page" : undefined} onClick={() => isMobile && setOpenMobile(false)}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, type LucideIcon } from "lucide-react";
import { getInitials } from "../format";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";

interface AccountLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AccountMenuProps {
  /** How the signed-in person is named, e.g. "Dr. Priya Rajapaksa". */
  name: string;
  /** A second line under the name: a role or specialty. */
  detail?: string;
  email?: string;
  links?: AccountLink[];
  onSignOut: () => void;
}

// Who is signed in, at the foot of the sidebar, with their account links and sign out.
export function AccountMenu({ name, detail, email, links = [], onSignOut }: AccountMenuProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const initials = getInitials(name.replace(/^Dr\.?\s+/i, "")) || "?";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{name}</span>
                {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
              </span>
              <ChevronsUpDown className="ml-auto text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={4} className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium text-foreground">{name}</p>
              {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {links.length > 0 && (
              <>
                <DropdownMenuGroup>
                  {links.map(link => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} onClick={() => setOpenMobile(false)}>
                        <link.icon /> {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

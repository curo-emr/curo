"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Skeleton } from "../ui/skeleton";
import { formatRelative } from "../format";
import { cn } from "../ui/utils";
import { markAllNotificationsRead, markNotificationRead } from "./api";
import { notificationQueries } from "./queries";

export function NotificationsMenu() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const count = useQuery(notificationQueries.unreadCount()).data ?? 0;
  // Loaded when the menu opens; the last list shows while a fresh one loads.
  const items = useQuery({ ...notificationQueries.latest(), enabled: open });

  // Marks one notification read (or all, with no id) at once; the server's answer then replaces the guess.
  const markRead = useMutation({
    mutationFn: (id?: string) => (id ? markNotificationRead(id) : markAllNotificationsRead()),
    onMutate: id => {
      queryClient.setQueryData(notificationQueries.latest().queryKey, prev =>
        prev?.map(n => (!id || n.id === id ? { ...n, isRead: true } : n)));
      queryClient.setQueryData(notificationQueries.unreadCount().queryKey, c => (id ? Math.max(0, (c ?? 0) - 1) : 0));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueries.all }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-semibold">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={() => markRead.mutate(undefined)}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!items.data && items.isError ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Couldn&apos;t load notifications.</p>
          ) : !items.data ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : items.data.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            items.data.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                className={cn("flex w-full gap-3 px-4 py-3 text-left border-b last:border-0 hover:bg-muted/60 transition-colors", !n.isRead && "bg-primary/[0.03]")}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{n.title}</span>
                  <span className="block text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  <span className="block mt-1 text-[11px] text-muted-foreground/80">{formatRelative(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

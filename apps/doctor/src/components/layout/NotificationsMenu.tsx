"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@curo/web/ui/popover";
import { Skeleton } from "@curo/web/ui/skeleton";
import { cn, formatRelative } from "@/lib/utils";
import {
  getNotificationCount, getNotifications, markAllNotificationsRead, markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";

export function NotificationsMenu() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const refreshCount = useCallback(() => { getNotificationCount().then(setCount); }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  const onOpenChange = (open: boolean) => {
    if (!open) return;
    setItems(null);
    getNotifications().then(setItems).catch(() => setItems([]));
  };

  const markRead = async (n: AppNotification) => {
    if (n.isRead) return;
    setItems(prev => prev?.map(i => (i.id === n.id ? { ...i, isRead: true } : i)) ?? prev);
    setCount(c => Math.max(0, c - 1));
    await markNotificationRead(n.id).catch(refreshCount);
  };

  const markAll = async () => {
    setItems(prev => prev?.map(i => ({ ...i, isRead: true })) ?? prev);
    setCount(0);
    await markAllNotificationsRead().catch(refreshCount);
  };

  return (
    <Popover onOpenChange={onOpenChange}>
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
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={markAll}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items === null ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            items.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n)}
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

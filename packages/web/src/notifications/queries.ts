import { queryOptions } from "@tanstack/react-query";
import { POLL_INBOX_MS } from "../query/poll";
import { getNotificationCount, getNotifications } from "./api";

export const notificationQueries = {
  all: ["notifications"] as const,
  unreadCount: () => queryOptions({
    queryKey: [...notificationQueries.all, "count"],
    queryFn: getNotificationCount,
    refetchInterval: POLL_INBOX_MS,
  }),
  latest: () => queryOptions({
    queryKey: [...notificationQueries.all, "latest"],
    queryFn: () => getNotifications(),
  }),
};

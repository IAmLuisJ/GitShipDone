import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  NotificationItem,
  type Notification,
} from "@/components/notifications/NotificationItem";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  collapsed?: boolean;
  projects?: Array<{ id: string; name: string }>;
};

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

const notificationsQueryKey = ["notifications", "all"];

export function NotificationBell({
  collapsed = false,
  projects = [],
}: NotificationBellProps) {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      const response = await api.get<NotificationsResponse>(
        "/notifications?unreadOnly=false",
      );
      return response.data;
    },
    refetchInterval: 60000,
  });

  const data = notificationsQuery.data;
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const notifications = (data?.notifications ?? []).slice(0, 20).map((notification) => ({
    ...notification,
    projectName:
      notification.projectName ??
      (notification.projectId ? projectNames.get(notification.projectId) : null),
  }));
  const unreadCount = data?.unreadCount ?? 0;

  async function handleMarkAllRead() {
    await api.post("/notifications/read-all");
    queryClient.setQueryData<NotificationsResponse>(
      notificationsQueryKey,
      (current) =>
        current
          ? {
              unreadCount: 0,
              notifications: current.notifications.map((notification) => ({
                ...notification,
                isRead: true,
              })),
            }
          : current,
    );
    await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  }

  function handleNotificationChanged() {
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "relative w-full justify-start gap-2 px-2",
            collapsed && "justify-center px-0",
          )}
          aria-label="Notifications"
        >
          <Bell data-icon="inline-start" />
          <span className={cn(collapsed && "sr-only")}>Notifications</span>
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[0.65rem] font-semibold leading-4 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="right" className="w-80 p-0">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <div>
            <div className="font-medium">Notifications</div>
            <div className="text-xs text-muted-foreground">
              {unreadCount} unread
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Button>
        </div>

        {notifications.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <div className="grid gap-2 p-3">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onChanged={handleNotificationChanged}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

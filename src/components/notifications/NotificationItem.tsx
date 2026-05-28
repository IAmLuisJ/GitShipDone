import { useState, type KeyboardEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, CalendarClock, MoreHorizontal, Trophy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export type Notification = {
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  projectId: string | null;
  projectName?: string | null;
  type: string;
};

type NotificationItemProps = {
  notification: Notification;
  onChanged: () => void;
};

function renderTypeIcon(type: string) {
  const className = "mt-0.5 size-4 text-muted-foreground";
  if (type === "milestone_completed") return <Trophy className={className} />;
  if (type === "milestone_due" || type === "todo_due") {
    return <CalendarClock className={className} />;
  }
  return <Bell className={className} />;
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

export function NotificationItem({ notification, onChanged }: NotificationItemProps) {
  const navigate = useNavigate();
  const [customDate, setCustomDate] = useState("");

  async function markRead() {
    if (!notification.isRead) {
      await api.patch(`/notifications/${notification.id}/read`);
      onChanged();
    }
  }

  async function handleOpen() {
    await markRead();
    if (notification.projectId) {
      navigate(`/projects/${notification.projectId}`);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleOpen();
    }
  }

  async function snoozeUntil(date: Date) {
    await api.patch(`/notifications/${notification.id}/snooze`, {
      snoozeUntil: date.toISOString(),
    });
    onChanged();
  }

  async function handleCustomSnooze() {
    if (!customDate) return;
    await snoozeUntil(new Date(`${customDate}T09:00:00`));
    setCustomDate("");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="notification-item"
      onClick={() => void handleOpen()}
      onKeyDown={handleKeyDown}
      className={cn(
        "grid cursor-pointer gap-2 rounded-md border p-3 text-left outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
        !notification.isRead && "border-blue-200 bg-blue-50/70 dark:bg-blue-950/20",
      )}
    >
      <div className="flex items-start gap-2">
        {renderTypeIcon(notification.type)}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {!notification.isRead ? (
              <span
                className="mt-1.5 size-2 rounded-full bg-blue-500"
                aria-label="Unread"
              />
            ) : null}
            <p className="min-w-0 flex-1 text-sm leading-5">{notification.message}</p>
          </div>
          {notification.projectId ? (
            <Link
              to={`/projects/${notification.projectId}`}
              onClick={(event) => {
                event.stopPropagation();
                void markRead();
              }}
              className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
            >
              {notification.projectName ?? "Open project"}
            </Link>
          ) : null}
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Notification actions for ${notification.message}`}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuItem onClick={() => void markRead()}>
              Dismiss
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void snoozeUntil(new Date(Date.now() + 60 * 60 * 1000))}
            >
              Snooze 1 hour
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                void snoozeUntil(new Date(Date.now() + 3 * 60 * 60 * 1000))
              }
            >
              Snooze 3 hours
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void snoozeUntil(tomorrowMorning())}>
              Snooze until tomorrow
            </DropdownMenuItem>
            <div className="grid gap-2 p-2">
              <Input
                type="date"
                aria-label="Custom snooze date"
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
              />
              <Button type="button" size="sm" onClick={() => void handleCustomSnooze()}>
                Snooze custom date
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

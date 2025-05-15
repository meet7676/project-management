"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"

export function NotificationMenu() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch notifications when dropdown is opened
  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const notifs = await getUserNotifications(10, 0)
      setNotifications(notifs)
      const count = await getUnreadNotificationCount()
      setUnreadCount(count)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch unread count on initial load and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount()
        setUnreadCount(count)
      } catch (error) {
        console.error("Error fetching unread count:", error)
      }
    }

    fetchUnreadCount()

    // Refresh unread count every minute
    const interval = setInterval(fetchUnreadCount, 60000)

    return () => clearInterval(interval)
  }, [])

  // Handle dropdown open/close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      fetchNotifications()
    }
  }

  // Handle clicking on a notification
  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark as read
      if (!notification.isRead) {
        await markNotificationAsRead(notification.$id)
        // Update local state
        setNotifications(notifications.map((n) => (n.$id === notification.$id ? { ...n, isRead: true } : n)))
        setUnreadCount(Math.max(unreadCount - 1, 0))
      }

      // Navigate based on notification type
      if (notification.projectId) {
        if (notification.taskId) {
          router.push(`/project/${notification.projectId}?task=${notification.taskId}`)
        } else {
          router.push(`/project/${notification.projectId}`)
        }
      }

      // Close the dropdown
      setIsOpen(false)
    } catch (error) {
      console.error("Error handling notification click:", error)
    }
  }

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      // Update local state
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  // Render notification content based on type
  const renderNotificationContent = (notification: any) => {
    const { type, content } = notification

    switch (type) {
      case "user_added":
        return (
          <div className="text-sm">
            <span className="font-medium">{content.newMemberName}</span> was added to{" "}
            <span className="font-medium">{content.projectName}</span> by {content.adderName}
          </div>
        )
      case "task_created":
        return (
          <div className="text-sm">
            <span className="font-medium">{content.creatorName}</span> created a new task:{" "}
            <span className="font-medium">{content.taskTitle}</span> in {content.projectName}
          </div>
        )
      case "task_assigned":
        return (
          <div className="text-sm">
            <span className="font-medium">{content.assignerName}</span> assigned you a task:{" "}
            <span className="font-medium">{content.taskTitle}</span> in {content.projectName}
          </div>
        )
      case "task_updated":
        return (
          <div className="text-sm">
            <span className="font-medium">{content.updaterName}</span> moved task{" "}
            <span className="font-medium">{content.taskTitle}</span> to {content.newStatus.replace("-", " ")}
          </div>
        )
      case "project_archived":
        return (
          <div className="text-sm">
            <span className="font-medium">{content.actorName}</span> archived project{" "}
            <span className="font-medium">{content.projectName}</span>
          </div>
        )
      case "project_restored":
        return (
          <div className="text-sm">
            <span className="font-medium">{content.actorName}</span> restored project{" "}
            <span className="font-medium">{content.projectName}</span>
          </div>
        )
      default:
        return <div className="text-sm">You have a new notification</div>
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No notifications yet</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.$id}
                className={`p-4 cursor-pointer ${!notification.isRead ? "bg-gray-50 dark:bg-gray-800" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex flex-col gap-1 w-full">
                  {renderNotificationContent(notification)}
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>
                  {!notification.isRead && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

"use client"

import { formatDistanceToNow } from "date-fns"
import { markNotificationAsRead } from "@/lib/notifications"
import { useRouter } from "next/navigation"

interface NotificationItemProps {
  notification: any
  onRead: () => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter()

  const handleClick = async () => {
    try {
      // Mark as read if not already
      if (!notification.isRead) {
        await markNotificationAsRead(notification.$id)
        onRead()
      }

      // Navigate based on notification type
      if (notification.projectId) {
        if (notification.taskId) {
          router.push(`/project/${notification.projectId}?task=${notification.taskId}`)
        } else {
          router.push(`/project/${notification.projectId}`)
        }
      }
    } catch (error) {
      console.error("Error handling notification click:", error)
    }
  }

  // Render notification content based on type
  const renderContent = () => {
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
    <div
      className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
        !notification.isRead ? "bg-gray-50 dark:bg-gray-800/50" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-1 relative">
        {renderContent()}
        <div className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </div>
        {!notification.isRead && <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500"></div>}
      </div>
    </div>
  )
}

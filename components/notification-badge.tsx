"use client"

import { useState, useEffect } from "react"
import { getUnreadNotificationCount } from "@/lib/notifications"

interface NotificationBadgeProps {
  className?: string
}

export function NotificationBadge({ className = "" }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        setIsLoading(true)
        const count = await getUnreadNotificationCount()
        setUnreadCount(count)
      } catch (error) {
        console.error("Error fetching unread count:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUnreadCount()

    // Refresh unread count every minute
    const interval = setInterval(fetchUnreadCount, 60000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading || unreadCount === 0) {
    return null
  }

  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white ${className}`}
    >
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )
}

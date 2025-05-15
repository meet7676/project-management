"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { NotificationItem } from "@/components/notification-item"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/appwrite"
import { getUserNotifications, markAllNotificationsAsRead } from "@/lib/notifications"

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        setUser(currentUser)

        await fetchNotifications()
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const notifs = await getUserNotifications(50, 0) // Get more notifications for the dedicated page
      setNotifications(notifs)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      // Update local state
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const handleNotificationRead = () => {
    // Refresh notifications after one is marked as read
    fetchNotifications()
  }

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.isRead
    if (activeTab === "read") return notification.isRead
    return true
  })

  if (isLoading && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />
      <main className="flex-1 p-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-6">Notifications</h1>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Notifications</CardTitle>
                <CardDescription>Stay updated on your projects and tasks</CardDescription>
              </div>
              {notifications.some((n) => !n.isRead) && (
                <Button variant="outline" onClick={handleMarkAllAsRead}>
                  Mark all as read
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                  <TabsTrigger value="unread">Unread ({notifications.filter((n) => !n.isRead).length})</TabsTrigger>
                  <TabsTrigger value="read">Read ({notifications.filter((n) => n.isRead).length})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-start gap-4 p-4 border-b">
                          <div className="space-y-2 w-full">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {activeTab === "all"
                        ? "No notifications yet"
                        : activeTab === "unread"
                          ? "No unread notifications"
                          : "No read notifications"}
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      {filteredNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.$id}
                          notification={notification}
                          onRead={handleNotificationRead}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

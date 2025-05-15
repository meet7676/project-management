import { Client, Databases, ID, Query } from "appwrite"
import { getCurrentUser } from "./appwrite"

// Initialize the Appwrite client
const client = new Client().setEndpoint("https://cloud.appwrite.io/v1").setProject("67d05997003e7a634b74")

const databases = new Databases(client)

// Database and collection IDs
const DATABASE_ID = ""
const NOTIFICATIONS_COLLECTION_ID = "" // You'll need to create this collection in Appwrite

// Notification types
export const NOTIFICATION_TYPES = {
  USER_ADDED: "user_added",
  TASK_CREATED: "task_created",
  TASK_ASSIGNED: "task_assigned",
  TASK_UPDATED: "task_updated",
  PROJECT_ARCHIVED: "project_archived",
  PROJECT_RESTORED: "project_restored",
}

// Create a notification for a user
export async function createNotification(
  userId: string,
  type: string,
  content: any,
  projectId: string,
  taskId?: string,
) {
  try {
    return await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, ID.unique(), {
      userId,
      type,
      content: JSON.stringify(content),
      projectId,
      taskId: taskId || null,
      createdAt: new Date().toISOString(),
      isRead: false,
    })
  } catch (error) {
    console.error("Error creating notification:", error)
    // Don't throw error to prevent disrupting the main workflow
  }
}

// Create notifications for all project members
export async function createProjectNotification(
  projectId: string,
  type: string,
  content: any,
  excludeUserId?: string,
  taskId?: string,
) {
  try {
    // Get project to find all members
    const project = await databases.getDocument(DATABASE_ID, "67d05af8001976f9bc40", projectId)

    if (!project || !project.members) return

    // Parse members if they're stored as JSON strings
    const members = project.members.map((member) => (typeof member === "string" ? JSON.parse(member) : member))

    // Create a notification for each member except the excluded user
    for (const member of members) {
      if (member.id !== excludeUserId) {
        await createNotification(member.id, type, content, projectId, taskId)
      }
    }
  } catch (error) {
    console.error("Error creating project notifications:", error)
    // Don't throw error to prevent disrupting the main workflow
  }
}

// Get notifications for the current user
export async function getUserNotifications(limit = 10, offset = 0) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const response = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
      Query.equal("userId", currentUser.$id),
      Query.orderDesc("createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ])

    // Parse the content field from JSON string to object
    return response.documents.map((notification) => ({
      ...notification,
      content: JSON.parse(notification.content),
    }))
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return []
  }
}

// Get unread notification count for the current user
export async function getUnreadNotificationCount() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return 0
    }

    const response = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
      Query.equal("userId", currentUser.$id),
      Query.equal("isRead", false),
    ])

    return response.total
  } catch (error) {
    console.error("Error fetching unread notification count:", error)
    return 0
  }
}

// Mark a notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Verify the notification belongs to the current user
    const notification = await databases.getDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, notificationId)
    if (notification.userId !== currentUser.$id) {
      throw new Error("Permission denied")
    }

    return await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, notificationId, {
      isRead: true,
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

// Mark all notifications as read for the current user
export async function markAllNotificationsAsRead() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Get all unread notifications for the user
    const response = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, [
      Query.equal("userId", currentUser.$id),
      Query.equal("isRead", false),
    ])

    // Update each notification
    for (const notification of response.documents) {
      await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, notification.$id, {
        isRead: true,
      })
    }

    return true
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

// Delete a notification
export async function deleteNotification(notificationId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Verify the notification belongs to the current user
    const notification = await databases.getDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, notificationId)
    if (notification.userId !== currentUser.$id) {
      throw new Error("Permission denied")
    }

    return await databases.deleteDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID, notificationId)
  } catch (error) {
    console.error("Error deleting notification:", error)
    throw error
  }
}

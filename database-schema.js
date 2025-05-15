/**
 * Appwrite Database Schema for TaskFlow Project Management App
 *
 * This is a reference document for the database schema.
 */

// DATABASE: "TaskFlow" (ID: "")

/**
 * Projects Collection
 * Collection ID: ""
 *
 * Stores information about projects
 */
const projectsCollection = {
  // Schema fields
  $id: {
    type: "string",
    required: true,
    default: "unique()",
    // Primary key
  },
  name: {
    type: "string",
    required: true,
    size: 100,
    // Project name
  },
  description: {
    type: "string",
    required: false,
    size: 1000,
    // Project description
  },
  status: {
    type: "string",
    required: true,
    default: "active",
    // Values: "active", "archived"
  },
  createdAt: {
    type: "datetime",
    required: true,
    default: "now()",
    // Project creation time
  },
  deadline: {
    type: "datetime",
    required: false,
    // Project deadline
  },
  taskCount: {
    type: "integer",
    required: true,
    default: 0,
    // Number of tasks in the project
    min: 0,
  },
  members: {
    type: "array",
    required: false,
    default: [],
    // Array of team members objects
    items: {
      type: "object",
      properties: {
        id: {
          type: "string",
          required: true,
        },
        name: {
          type: "string",
          required: true,
        },
      },
    },
  },
  adminId: {
    type: "string",
    required: true,
    // User ID of the project admin (renamed from ownerId)
  },
}

/**
 * Tasks Collection
 * Collection ID: ""
 *
 * Stores information about tasks within projects
 */
const tasksCollection = {
  // Schema fields
  $id: {
    type: "string",
    required: true,
    default: "unique()",
    // Primary key
  },
  projectId: {
    type: "string",
    required: true,
    // Foreign key to projects collection
  },
  title: {
    type: "string",
    required: true,
    size: 100,
    // Task title
  },
  description: {
    type: "string",
    required: false,
    size: 1000,
    // Task description
  },
  status: {
    type: "string",
    required: true,
    default: "todo",
    // Values: "todo", "in-progress", "done"
  },
  priority: {
    type: "string",
    required: true,
    default: "medium",
    // Values: "low", "medium", "high"
  },
  deadline: {
    type: "datetime",
    required: false,
    // Task deadline
  },
  createdAt: {
    type: "datetime",
    required: true,
    default: "now()",
    // Task creation time
  },
  assignee: {
    type: "object",
    required: false,
    // Task assignee information
    properties: {
      id: {
        type: "string",
        required: true,
      },
      name: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: false,
        // Values: "admin", "project-manager", "developer"
      },
    },
  },
  createdBy: {
    type: "string",
    required: true,
    // User ID of task creator
  },
}

/**
 * Users Collection (if needed, separate from Appwrite Auth)
 * Collection ID: "users"
 *
 * Stores additional user information not covered by Appwrite Auth
 */
const usersCollection = {
  // Schema fields
  $id: {
    type: "string",
    required: true,
    // Primary key, should match Appwrite Auth user ID
  },
  name: {
    type: "string",
    required: true,
    size: 100,
    // User's full name
  },
  email: {
    type: "string",
    required: true,
    size: 100,
    // User's email address
  },
  avatarUrl: {
    type: "string",
    required: false,
    // URL to user's avatar image
  },
  createdAt: {
    type: "datetime",
    required: true,
    default: "now()",
    // Account creation time
  },
  role: {
    type: "string",
    required: true,
    default: "developer",
    // Values: "admin", "project-manager", "developer"
  },
}

/**
 * Notifications Collection
 * Collection ID: "notifications"
 *
 * Stores user notifications
 */
const notificationsCollection = {
  // Schema fields
  $id: {
    type: "string",
    required: true,
    default: "unique()",
    // Primary key
  },
  userId: {
    type: "string",
    required: true,
    // User who should receive the notification
  },
  type: {
    type: "string",
    required: true,
    // Values: "user_added", "task_created", "task_assigned", "task_updated", "project_archived", "project_restored"
  },
  content: {
    type: "string",
    required: true,
    // JSON string containing notification details
  },
  projectId: {
    type: "string",
    required: true,
    // Reference to the related project
  },
  taskId: {
    type: "string",
    required: false,
    // Reference to the related task (if applicable)
  },
  createdAt: {
    type: "datetime",
    required: true,
    default: "now()",
    // Notification creation time
  },
  isRead: {
    type: "boolean",
    required: true,
    default: false,
    // Whether the notification has been read
  },
}

/**
 * Appwrite Indexes and Attributes
 *
 * Define indexes for efficient queries
 */

// Projects Collection Indexes
const projectsIndexes = [
  {
    key: "adminId",
    type: "key",
    attributes: ["adminId"],
    // For querying projects by admin
  },
  {
    key: "status_createdAt",
    type: "key",
    attributes: ["status", "createdAt"],
    // For filtering and sorting projects
  },
  {
    key: "deadline",
    type: "key",
    attributes: ["deadline"],
    // For querying projects by deadline
  },
]

// Tasks Collection Indexes
const tasksIndexes = [
  {
    key: "projectId",
    type: "key",
    attributes: ["projectId"],
    // For querying tasks by project
  },
  {
    key: "projectId_status",
    type: "key",
    attributes: ["projectId", "status"],
    // For filtering tasks by status within a project
  },
  {
    key: "assignee.id",
    type: "key",
    attributes: ["assignee.id"],
    // For querying tasks assigned to a specific user
  },
  {
    key: "deadline",
    type: "key",
    attributes: ["deadline"],
    // For querying tasks by deadline
  },
]

// Notifications Collection Indexes
const notificationsIndexes = [
  {
    key: "userId",
    type: "key",
    attributes: ["userId"],
    // For querying notifications by user
  },
  {
    key: "userId_isRead",
    type: "key",
    attributes: ["userId", "isRead"],
    // For querying unread notifications for a user
  },
  {
    key: "createdAt",
    type: "key",
    attributes: ["createdAt"],
    // For sorting notifications by creation time
  },
]

/**
 * Appwrite Security Rules
 *
 * Define who can read, create, update and delete documents
 */

// Example of a security rule for the notifications collection
const notificationsSecurityRules = {
  read: [
    // Users can only read their own notifications
    "document.userId === user.id",
    // Admins can read all notifications
    "user.role === 'admin'",
  ],
  create: [
    // Only the system or admins can create notifications
    "user.role === 'admin'",
  ],
  update: [
    // Users can only update their own notifications (to mark as read)
    "document.userId === user.id && ['isRead'].includes(request.keys[0])",
    // Admins can update any notification
    "user.role === 'admin'",
  ],
  delete: [
    // Users can only delete their own notifications
    "document.userId === user.id",
    // Admins can delete any notification
    "user.role === 'admin'",
  ],
}

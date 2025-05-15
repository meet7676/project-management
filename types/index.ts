export interface User {
  $id: string
  name: string
  email: string
  role: "admin" | "project-manager" | "developer"
}

export interface ProjectMember {
  id: string
  name: string
  email: string
  globalRole: string
  projectRole: "admin" | "project-manager" | "developer"
}

export interface Project {
  $id: string
  name: string
  description: string
  status: string
  createdAt: string
  deadline?: string
  taskCount?: number
  members: ProjectMember[]
  adminId: string
  // New billing fields
  defaultTaskCompensation?: number
  currency?: string
  billingCycle?: "weekly" | "monthly" | "project"
}

export interface Task {
  $id: string
  projectId: string
  title: string
  description: string
  status: string
  priority: string
  deadline?: string
  createdAt: string
  assigneeId?: string | null
  assignee?: ProjectMember | null
  createdBy: string
  // New billing fields
  compensation?: number
  billingStatus?: "unbilled" | "billed" | "paid"
  completedAt?: string
}

// Updated Bill interface to match the schema
export interface Bill {
  $id: string
  projectId: string
  developerId: string
  developerName: string
  amount: number // Will be stored as integer in the database
  currency: string
  status: "draft" | "sent" | "paid"
  generatedAt: string // Corrected field name
  paidAt?: string // Corrected field name
  dueDate?: string
  tasks: string[] // Array of task IDs
  notes?: string
}

import { Client, Databases, ID, Query } from "appwrite"
import { getCurrentUser } from "./appwrite"
import { getProject } from "./projects"

// Initialize the Appwrite client
const client = new Client().setEndpoint("https://cloud.appwrite.io/v1").setProject("67d05997003e7a634b74")

const databases = new Databases(client)

// Database and collection IDs
const DATABASE_ID = ""
const TASKS_COLLECTION_ID = ""
const BILLS_COLLECTION_ID = "" // You'll need to create this collection in Appwrite

// Calculate total compensation for a developer in a project
export async function calculateDeveloperCompensation(
  projectId: string,
  developerId: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user has access to this project
    const project = await getProject(projectId)
    if (!project) {
      throw new Error("Project not found")
    }

    // Only admins, project admins, or project managers can access billing
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Get all completed tasks assigned to the developer
    const queries = [
      Query.equal("projectId", projectId),
      Query.equal("assigneeId", developerId),
      Query.equal("status", "done"),
    ]

    // Add date range filters if provided
    if (startDate) {
      queries.push(Query.greaterThanEqual("completedAt", startDate))
    }
    if (endDate) {
      queries.push(Query.lessThanEqual("completedAt", endDate))
    }

    const response = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, queries)

    // Calculate total compensation
    let totalCompensation = 0
    for (const task of response.documents) {
      totalCompensation += task.compensation || 0
    }

    return {
      totalCompensation,
      tasks: response.documents,
      currency: project.currency || "USD",
    }
  } catch (error) {
    console.error("Error calculating developer compensation:", error)
    throw error
  }
}

// Get all unbilled tasks for a developer in a project
export async function getUnbilledTasks(projectId: string, developerId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user has access to this project
    const project = await getProject(projectId)
    if (!project) {
      throw new Error("Project not found")
    }

    // Only admins, project admins, or project managers can access billing
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Get all completed tasks assigned to the developer that are unbilled
    const response = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
      Query.equal("projectId", projectId),
      Query.equal("assigneeId", developerId),
      Query.equal("status", "done"), // Task progress status should be done
      Query.equal("billingStatus", "unbilled"), // Using the separate billingStatus field
    ])

    return response.documents
  } catch (error) {
    console.error("Error getting unbilled tasks:", error)
    throw error
  }
}

// Generate a bill for a developer
export async function generateBill(
  projectId: string,
  developerId: string,
  developerName: string,
  taskIds: string[],
  amount: number,
  notes?: string,
  dueDate?: string,
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user has access to this project
    const project = await getProject(projectId)
    if (!project) {
      throw new Error("Project not found")
    }

    // Only admins, project admins, or project managers can generate bills
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Create the bill - using the correct field names from the schema
    // and ensuring amount is an integer
    const bill = await databases.createDocument(DATABASE_ID, BILLS_COLLECTION_ID, ID.unique(), {
      projectId,
      developerId,
      developerName,
      amount: Math.round(amount), // Convert to integer
      currency: project.currency || "USD",
      status: "draft",
      generatedAt: new Date().toISOString(), // Corrected from generatedAt
      dueDate: dueDate || null,
      tasks: taskIds, // Ensure this is stored as array of task IDs (strings)
      notes: notes || "",  // Ensure notes is never null
    })

    // Update the billing status of the tasks
    for (const taskId of taskIds) {
      await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId, {
        billingStatus: "billed", // Make sure we're using billingStatus, not status
      })
    }

    return bill
  } catch (error) {
    console.error("Error generating bill:", error)
    throw error
  }
}

// Get all bills for a project
export async function getBillsByProject(projectId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user has access to this project
    const project = await getProject(projectId)
    if (!project) {
      throw new Error("Project not found")
    }

    // Only admins, project admins, or project managers can view all bills
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    const response = await databases.listDocuments(DATABASE_ID, BILLS_COLLECTION_ID, [
      Query.equal("projectId", projectId),
      Query.orderDesc("generatedAt"), // Corrected from generatedAt to generatedAt
    ])

    return response.documents
  } catch (error) {
    console.error("Error getting bills by project:", error)
    throw error
  }
}

// Get all bills for a developer
export async function getBillsByDeveloper(developerId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Developers can only view their own bills
    if (currentUser.role === "developer" && currentUser.$id !== developerId) {
      throw new Error("Permission denied")
    }

    const response = await databases.listDocuments(DATABASE_ID, BILLS_COLLECTION_ID, [
      Query.equal("developerId", developerId),
      Query.orderDesc("generatedAt"), // Corrected field name from generatedAt to generatedAt
    ])

    return response.documents
  } catch (error) {
    console.error("Error getting bills by developer:", error)
    throw error
  }
}

// Update bill status
export async function updateBillStatus(billId: string, status: "draft" | "sent" | "paid", paidDate?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const bill = await databases.getDocument(DATABASE_ID, BILLS_COLLECTION_ID, billId)
    const project = await getProject(bill.projectId)

    // Only admins, project admins, or project managers can update bill status
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    const updateData: any = { status }
    if (status === "paid" && !bill.paidAt) {
      updateData.paidAt = paidDate || new Date().toISOString() // Corrected field name
    }

    const updatedBill = await databases.updateDocument(DATABASE_ID, BILLS_COLLECTION_ID, billId, updateData)

    // If bill is marked as paid, update task billing status
    if (status === "paid") {
      for (const taskId of bill.tasks) {
        await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId, {
          billingStatus: "paid", // Using the separate billingStatus field
        })
      }
    }

    return updatedBill
  } catch (error) {
    console.error("Error updating bill status:", error)
    throw error
  }
}

// Delete a bill (only draft bills can be deleted)
export async function deleteBill(billId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const bill = await databases.getDocument(DATABASE_ID, BILLS_COLLECTION_ID, billId)
    const project = await getProject(bill.projectId)

    // Only admins, project admins, or project managers can delete bills
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Only draft bills can be deleted
    if (bill.status !== "draft") {
      throw new Error("Only draft bills can be deleted")
    }

    // Reset the billing status of the tasks
    for (const taskId of bill.tasks) {
      await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId, {
        billingStatus: "unbilled", // Using the billingStatus field consistently
      })
    }

    return await databases.deleteDocument(DATABASE_ID, BILLS_COLLECTION_ID, billId)
  } catch (error) {
    console.error("Error deleting bill:", error)
    throw error
  }
}

// Add a function to update project billing settings
export async function updateProjectBillingSettings(
  projectId: string,
  defaultTaskCompensation: number,
  currency: string,
  billingCycle: "weekly" | "monthly" | "project",
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user has access to this project
    const project = await getProject(projectId)
    if (!project) {
      throw new Error("Project not found")
    }

    // Only admins, project admins, or project managers can update billing settings
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Update project billing settings
    return await databases.updateDocument(DATABASE_ID, "projects", projectId, {
      defaultTaskCompensation,
      currency,
      billingCycle,
    })
  } catch (error) {
    console.error("Error updating project billing settings:", error)
    throw error
  }
}

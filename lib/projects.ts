import { Client, Databases, ID, Query } from "appwrite"
import { getCurrentUser, getUserById } from "./appwrite"
import { createProjectNotification, createNotification, NOTIFICATION_TYPES } from "./notifications"

// Initialize the Appwrite client
const client = new Client().setEndpoint("https://cloud.appwrite.io/v1").setProject("67d05997003e7a634b74") // Replace with your Appwrite project ID

const databases = new Databases(client)

// Database and collection IDs
const DATABASE_ID = ""
const PROJECTS_COLLECTION_ID = ""
const TASKS_COLLECTION_ID = ""
const USERS_COLLECTION_ID = ""

// Update createProject function to check for project manager role
export async function createProject(
  name: string,
  description: string,
  deadline: string | null,
  memberIds: string[] = [],
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user has permission to create projects (admin or project manager)
    if (currentUser.role !== "admin" && currentUser.role !== "projectManager") {
      throw new Error("Permission denied. Only admins and project managers can create projects.")
    }

    // Make sure the current user is included in members
    const uniqueMemberIds = Array.from(new Set([currentUser.$id, ...memberIds]))

    // Fetch member details for the project
    const memberDetails = await Promise.all(
      uniqueMemberIds.map(async (memberId) => {
        const user = await getUserById(memberId)
        return user
          ? JSON.stringify({
              id: user.$id,
              name: user.name,
              email: user.email,
              globalRole: user.role || "developer",
              projectRole: user.$id === currentUser.$id ? "admin" : "developer",
            })
          : null
      }),
    )

    const project = await databases.createDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, ID.unique(), {
      name,
      description,
      deadline: deadline || null,
      status: "active",
      createdAt: new Date().toISOString(),
      taskCount: 0,
      members: memberDetails,
      adminId: currentUser.$id,
    })

    return {
      ...project,
      members: memberDetails.filter(Boolean),
    }
  } catch (error) {
    console.error("Error creating project:", error)
    throw error
  }
}

// Update getProjects function to handle project manager role
export async function getProjects() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return []
    }

    let queries = []

    if (currentUser.role === "admin") {
      // Admins can see all projects
      queries = [Query.orderDesc("createdAt")]
    } else if (currentUser.role === "projectManager") {
      // Project managers can see projects they created or are members of
      queries = [
        Query.or([
          Query.equal("adminId", currentUser.$id),
          Query.contains(
            "members",
            JSON.stringify({
              id: currentUser.$id,
              name: currentUser.name,
              email: currentUser.email,
              globalRole: currentUser.role || "developer",
              projectRole: currentUser.$id === currentUser.$id ? "admin" : "developer",
            }),
          ),
        ]),
        Query.orderDesc("createdAt"),
      ]
    } else {
      // Developers can only see projects they are members of
      queries = [
        Query.contains(
          "members",
          JSON.stringify({
            id: currentUser.$id,
            name: currentUser.name,
            email: currentUser.email,
            globalRole: currentUser.role || "developer",
            projectRole: currentUser.$id === currentUser.$id ? "admin" : "developer",
          }),
        ),
        Query.orderDesc("createdAt"),
      ]
    }

    const response = await databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, queries)

    // Fetch member details for each project
    // const projectsWithMembers = await Promise.all(
    //   response.documents.map(async (project) => {
    //     const memberIds = project.members || []
    //     const memberDetails = await Promise.all(
    //       memberIds.map(async (memberId: string) => {
    //         const user = await getUserById(memberId)
    //         return user
    //           ? {
    //               id: user.$id,
    //               name: user.name,
    //               email: user.email,
    //               role: user.role || "developer",
    //             }
    //           : null
    //       }),
    //     )

    //     return {
    //       ...project,
    //       members: memberDetails.filter(Boolean),
    //     }
    //   }),
    // )

    // const projectsWithMembers = response.documents.map((project) => {
    //   project.members.map((member) => {
    //     member = JSON.parse(member)
    //   })
    //   return project
    // })
    const projectsWithMembers = response.documents.map((project) => {
      project.members = project.members.map((member) => JSON.parse(member))
      return project
    })

    const filteredProjects = projectsWithMembers.filter((project) => {
      return project.members.some((member) => member.id === currentUser.$id)
    })
    return filteredProjects
  } catch (error) {
    console.error("Error fetching projects:", error)
    return []
  }
}

// Get a specific project by ID
export async function getProject(projectId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId)
    project.members = project.members.map((member) => JSON.parse(member))
    // Check if user has access to this project
    if (
      currentUser.role !== "admin" &&
      project.adminId !== currentUser.$id &&
      !project.members.some((member) => member.id === currentUser.$id)
    ) {
      throw new Error("Access denied")
    }

    // If the project has the old member structure (array of IDs), convert it
    if (Array.isArray(project.members) && project.members.length > 0 && typeof project.members[0] === "string") {
      // This is the old format, convert it
      // const memberIds = project.members
      // const memberDetails = await Promise.all(
      //   memberIds.map(async (memberId: string) => {
      //     const user = await getUserById(memberId)
      //     return user
      //       ? {
      //           id: user.$id,
      //           name: user.name,
      //           email: user.email,
      //           globalRole: user.role || "developer",
      //           projectRole: user.$id === project.adminId ? "admin" : "developer",
      //         }
      //       : null
      //   }),
      // )
      const memberDetails = project.members.map((member) => {
        return JSON.parse(member)
      })

      // Update the project with the new member structure
      await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, {
        members: memberDetails.filter(Boolean),
      })

      return {
        ...project,
        members: memberDetails.filter(Boolean),
      }
    }

    return project
  } catch (error) {
    console.error("Error fetching project:", error)
    return null
  }
}

// Delete a project
export async function deleteProject(projectId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId)

    // Only admins or project admins can delete projects
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id) {
      throw new Error("Permission denied")
    }

    // Check if project is archived
    if (project.status === "archived") {
      throw new Error("Archived projects cannot be deleted. Please restore the project first.")
    }

    // Delete all tasks associated with the project
    const tasks = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [Query.equal("projectId", projectId)])

    for (const task of tasks.documents) {
      await databases.deleteDocument(DATABASE_ID, TASKS_COLLECTION_ID, task.$id)
    }

    // Delete the project
    return await databases.deleteDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId)
  } catch (error) {
    console.error("Error deleting project:", error)
    throw error
  }
}

// Update project status (archive/unarchive)
export async function updateProjectStatus(projectId: string, status: "active" | "archived") {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId)

    // Only admins or project admins can update project status
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Update the project status
    const updatedProject = await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, {
      status,
    })

    // Create notification for all project members
    const notificationType =
      status === "archived" ? NOTIFICATION_TYPES.PROJECT_ARCHIVED : NOTIFICATION_TYPES.PROJECT_RESTORED
    await createProjectNotification(
      projectId,
      notificationType,
      {
        projectName: project.name,
        action: status === "archived" ? "archived" : "restored",
        actorName: currentUser.name,
      },
      currentUser.$id, // Exclude the user who performed the action
    )

    return updatedProject
  } catch (error) {
    console.error("Error updating project status:", error)
    throw error
  }
}

// Update project deadline
export async function updateProjectDeadline(projectId: string, deadline: string | null) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId)

    // Only admins or project admins or project managers can update deadline
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Update the project deadline
    return await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, {
      deadline,
    })
  } catch (error) {
    console.error("Error updating project deadline:", error)
    throw error
  }
}

// Create a new task
export async function createTask(
  projectId: string,
  title: string,
  description: string,
  status: string,
  priority: string,
  deadline: string | null,
  assigneeId: string | null,
  compensation?: number, // New parameter
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user is the project admin or a project manager
    const project = await getProject(projectId)

    if (project.adminId !== currentUser.$id && currentUser.role !== "admin" && currentUser.role !== "projectManager") {
      throw new Error("Only project admins and project managers can create tasks")
    }

    // Use project default compensation if not specified
    const taskCompensation = compensation !== undefined ? compensation : project.defaultTaskCompensation || 0

    const task = await databases.createDocument(DATABASE_ID, TASKS_COLLECTION_ID, ID.unique(), {
      projectId,
      title,
      description,
      status, // This is now only for task progress status
      priority,
      deadline,
      createdAt: new Date().toISOString(),
      assigneeId, // Store user ID instead of object
      createdBy: currentUser.$id,
      compensation: taskCompensation,
      billingStatus: "unbilled", // Separate billing status field
      completedAt: status === "done" ? new Date().toISOString() : null,
    })

    // Update task count in the project
    await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, {
      taskCount: (project.taskCount || 0) + 1,
    })

    // Create notification for all project members about the new task
    await createProjectNotification(
      projectId,
      NOTIFICATION_TYPES.TASK_CREATED,
      {
        taskTitle: title,
        taskDescription: description,
        taskDeadline: deadline,
        projectName: project.name,
        creatorName: currentUser.name,
      },
      currentUser.$id, // Exclude the task creator
      task.$id,
    )

    // If task is assigned, create a specific notification for the assignee
    if (assigneeId) {
      const assignee = await getUserById(assigneeId)
      if (assignee) {
        await createNotification(
          assigneeId,
          NOTIFICATION_TYPES.TASK_ASSIGNED,
          {
            taskTitle: title,
            taskDescription: description,
            taskDeadline: deadline,
            projectName: project.name,
            assignerName: currentUser.name,
          },
          projectId,
          task.$id,
        )

        return {
          ...task,
          assignee: {
            id: assignee.$id,
            name: assignee.name,
            email: assignee.email,
            role: assignee.role || "developer",
          },
        }
      }
    }

    return task
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

// Get all tasks for a project
export async function getTasks(projectId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Check if user has access to this project
    await getProject(projectId)

    const response = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
      Query.equal("projectId", projectId),
      Query.orderDesc("createdAt"),
    ])

    // Fetch assignee details for each task
    const tasksWithAssignees = await Promise.all(
      response.documents.map(async (task) => {
        if (task.assigneeId) {
          const assignee = await getUserById(task.assigneeId)
          if (assignee) {
            return {
              ...task,
              assignee: {
                id: assignee.$id,
                name: assignee.name,
                email: assignee.email,
                role: assignee.role || "developer",
              },
            }
          }
        }
        return {
          ...task,
          assignee: null,
        }
      }),
    )

    return tasksWithAssignees
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return []
  }
}

// Delete a task
export async function deleteTask(taskId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const task = await databases.getDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId)
    const project = await getProject(task.projectId)

    // Check if user has permission to delete this task
    if (
      currentUser.role !== "admin" &&
      task.createdBy !== currentUser.$id &&
      project.adminId !== currentUser.$id &&
      currentUser.role !== "projectManager"
    ) {
      throw new Error("Permission denied")
    }

    // Delete the task
    await databases.deleteDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId)

    // Update task count in the project
    await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, task.projectId, {
      taskCount: Math.max((project.taskCount || 1) - 1, 0),
    })

    return true
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

// Update task status
export async function updateTaskStatus(taskId: string, newStatus: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const task = await databases.getDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId)
    const project = await getProject(task.projectId)

    // Check if user has permission to update this task
    const canUpdateTask =
      currentUser.role === "admin" ||
      currentUser.role === "projectManager" ||
      task.createdBy === currentUser.$id ||
      task.assigneeId === currentUser.$id ||
      project.adminId === currentUser.$id

    if (!canUpdateTask) {
      throw new Error("Permission denied")
    }

    // Set completedAt when task is moved to done
    const updateData: any = { status: newStatus }
    if (newStatus === "done" && task.status !== "done") {
      updateData.completedAt = new Date().toISOString()
    } else if (newStatus !== "done" && task.status === "done") {
      // If task is moved from done to another status, clear completedAt
      updateData.completedAt = null
    }

    // Do not change billingStatus field - leave it intact
    const updatedTask = await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId, updateData)

    // Create notification for task status update
    if (task.assigneeId && task.assigneeId !== currentUser.$id) {
      // Notify the assignee if they didn't make the change themselves
      await createNotification(
        task.assigneeId,
        NOTIFICATION_TYPES.TASK_UPDATED,
        {
          taskTitle: task.title,
          newStatus: newStatus,
          projectName: project.name,
          updaterName: currentUser.name,
        },
        task.projectId,
        taskId,
      )
    }

    return updatedTask
  } catch (error) {
    console.error("Error updating task status:", error)
    throw error
  }
}

// Update task deadline
export async function updateTaskDeadline(taskId: string, deadline: string | null) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const task = await databases.getDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId)
    const project = await getProject(task.projectId)

    // Check if user has permission to update this task
    const canUpdateTask =
      currentUser.role === "admin" ||
      currentUser.role === "projectManager" ||
      task.createdBy === currentUser.$id ||
      project.adminId === currentUser.$id

    if (!canUpdateTask) {
      throw new Error("Permission denied")
    }

    return await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId, {
      deadline,
    })
  } catch (error) {
    console.error("Error updating task deadline:", error)
    throw error
  }
}

// Update task assignee
export async function updateTaskAssignee(taskId: string, assigneeId: string | null) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const task = await databases.getDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId)
    const project = await getProject(task.projectId)

    // Check if user has permission to update this task
    const canUpdateTask =
      currentUser.role === "admin" ||
      currentUser.role === "projectManager" ||
      task.createdBy === currentUser.$id ||
      project.adminId === currentUser.$id

    if (!canUpdateTask) {
      throw new Error("Permission denied")
    }

    const updatedTask = await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION_ID, taskId, {
      assigneeId,
    })

    // If task is assigned to someone, create a notification
    if (assigneeId) {
      await createNotification(
        assigneeId,
        NOTIFICATION_TYPES.TASK_ASSIGNED,
        {
          taskTitle: task.title,
          taskDescription: task.description,
          taskDeadline: task.deadline,
          projectName: project.name,
          assignerName: currentUser.name,
        },
        task.projectId,
        taskId,
      )
    }

    return updatedTask
  } catch (error) {
    console.error("Error updating task assignee:", error)
    throw error
  }
}

// Add team member to project
export async function addTeamMember(projectId: string, email: string, projectRole = "developer") {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId)

    // Only admins, project admins, or project managers can add members
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Find user by email
    const users = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.equal("email", email)])

    if (users.documents.length === 0) {
      throw new Error("User not found")
    }

    const userToAdd = users.documents[0]
    const members = project.members || []

    // Check if user is already a member
    if (members.some((member) => member.id === userToAdd.$id)) {
      throw new Error("User is already a member of this project")
    }

    // Add user to members with project role
    const newMember = {
      id: userToAdd.$id,
      name: userToAdd.name,
      email: userToAdd.email,
      globalRole: userToAdd.role || "developer",
      projectRole: projectRole,
    }

    // Update the project with the new member
    await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, {
      members: [...members, JSON.stringify(newMember)],
    })

    // Create notification for all existing project members
    await createProjectNotification(
      projectId,
      NOTIFICATION_TYPES.USER_ADDED,
      {
        newMemberName: userToAdd.name,
        projectName: project.name,
        adderName: currentUser.name,
      },
      currentUser.$id, // Exclude the user who added the member
    )

    return {
      ...project,
      members: [...members, newMember],
    }
  } catch (error) {
    console.error("Error adding team member:", error)
    throw error
  }
}

// Remove team member from project
export async function removeTeamMember(projectId: string, userId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId)

    // Only admins, project admins, or project managers can remove members
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    // Cannot remove the admin
    if (userId === project.adminId) {
      throw new Error("Cannot remove the project admin")
    }

    const members = project.members || []

    // Filter out the member to remove
    const updatedMembers = members.filter((member) => member.id !== userId)

    // Update the project with the new members list
    await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, {
      members: updatedMembers,
    })

    // Unassign this user from any tasks in the project
    const tasks = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
      Query.equal("projectId", projectId),
      Query.equal("assigneeId", userId),
    ])

    for (const task of tasks.documents) {
      await databases.updateDocument(DATABASE_ID, TASKS_COLLECTION_ID, task.$id, {
        assigneeId: null,
      })
    }

    return {
      ...project,
      members: updatedMembers,
    }
  } catch (error) {
    console.error("Error removing team member:", error)
    throw error
  }
}

// Search users by email
export async function searchUsersByEmail(email: string) {
  try {
    const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.equal("email", email)])

    return response.documents
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}

// Add function to update project billing settings
export async function updateProjectBillingSettings(
  projectId: string,
  defaultTaskCompensation: number,
  currency: string,
  billingCycle: string,
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    const project = await getProject(projectId)

    // Only admins, project admins, or project managers can update billing settings
    if (currentUser.role !== "admin" && project.adminId !== currentUser.$id && currentUser.role !== "projectManager") {
      throw new Error("Permission denied")
    }

    return await databases.updateDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId, {
      defaultTaskCompensation,
      currency,
      billingCycle,
    })
  } catch (error) {
    console.error("Error updating project billing settings:", error)
    throw error
  }
}

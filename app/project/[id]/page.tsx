"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, UserPlus, RefreshCw, BarChart2, Archive, ArchiveRestore, Calendar, Receipt } from "lucide-react"
import { getCurrentUser } from "@/lib/appwrite"
import { DashboardHeader } from "@/components/dashboard-header"
import { KanbanBoard } from "@/components/kanban-board"
import { CreateTaskDialog } from "@/components/create-task-dialog"
import { AddTeamMemberDialog } from "@/components/add-team-member-dialog"
import { ProjectAnalytics } from "@/components/project-analytics"
import { ProjectBilling } from "@/components/project-billing"
import { getProject, getTasks, updateTaskStatus, updateProjectStatus } from "@/lib/projects"
import { showToast } from "@/lib/utils"
import type { Project, Task, User } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { format, isPast, isToday } from "date-fns"

// Fix the params issue in the ProjectPage component
export default function ProjectPage({ params }: { params: { id: string } }) {
  const projectId = params.id

  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showBilling, setShowBilling] = useState(false)

  const fetchProjectData = async () => {
    try {
      setIsRefreshing(true)
      const projectData = await getProject(projectId)
      if (!projectData) {
        router.push("/dashboard")
        return
      }
      setProject(projectData)

      const projectTasks = await getTasks(projectId)
      setTasks(projectTasks)
    } catch (error) {
      console.error("Error loading project:", error)
      showToast.error(error)
      router.push("/dashboard")
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        setUser(currentUser)

        await fetchProjectData()
      } catch (error) {
        console.error("Error loading project:", error)
        showToast.error(error)
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Listen for refresh events
    const handleRefresh = () => {
      fetchProjectData()
    }

    window.addEventListener("refresh-tasks", handleRefresh)

    return () => {
      window.removeEventListener("refresh-tasks", handleRefresh)
    }
  }, [projectId, router])

  const handleCreateTask = async (newTask: Task) => {
    await fetchProjectData()
    setIsTaskDialogOpen(false)
    showToast.success("Task created successfully")
  }

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus)
      // Update the task in the local state
      const updatedTasks = tasks.map((task) => (task.$id === taskId ? { ...task, status: newStatus } : task))
      setTasks(updatedTasks)
      showToast.success(`Task moved to ${newStatus.replace("-", " ")}`)
    } catch (error) {
      console.error("Error updating task status:", error)
      showToast.error(error)
      // Refresh to get the current state
      fetchProjectData()
    }
  }

  const handleAddMember = async () => {
    await fetchProjectData()
    showToast.success("Team member added successfully")
  }

  const handleTaskDeleted = async () => {
    await fetchProjectData()
  }

  const handleToggleArchive = async () => {
    if (!project) return

    try {
      setIsUpdatingStatus(true)
      const newStatus = project.status === "archived" ? "active" : "archived"
      await updateProjectStatus(project.$id, newStatus)

      // Update local state
      setProject({
        ...project,
        status: newStatus,
      })

      showToast.success(`Project ${newStatus === "active" ? "restored" : "archived"} successfully`)
    } catch (error) {
      console.error("Error updating project status:", error)
      showToast.error(error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Check user permissions
  const isAdmin = user?.role === "admin"
  const isProjectAdmin = project && project.adminId === user?.$id
  const isProjectManager = user?.role === "projectManager"
  const canManageProject = isAdmin || isProjectAdmin || isProjectManager
  const isArchived = project?.status === "archived"

  // Determine deadline status
  const getDeadlineStatus = () => {
    if (!project?.deadline) return null

    const deadlineDate = new Date(project.deadline)

    if (isPast(deadlineDate) && !isToday(deadlineDate) && project.status !== "archived") {
      return "overdue"
    } else if (isToday(deadlineDate) && project.status !== "archived") {
      return "today"
    }
    return "upcoming"
  }

  const deadlineStatus = getDeadlineStatus()

  if (isLoading || !project || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <main className="flex-1 p-6">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                {isArchived && (
                  <Badge variant="outline" className="text-base">
                    Archived
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={fetchProjectData} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="sr-only">Refresh</span>
                </Button>

                {canManageProject && (
                  <Button variant="outline" onClick={handleToggleArchive} disabled={isUpdatingStatus}>
                    {isUpdatingStatus ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                    ) : isArchived ? (
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" />
                    )}
                    {isArchived ? "Restore Project" : "Archive Project"}
                  </Button>
                )}

                {(isAdmin || isProjectAdmin || isProjectManager) && !isArchived && (
                  <>
                    <Button
                      variant={showBilling ? "default" : "outline"}
                      onClick={() => {
                        setShowBilling(!showBilling)
                        if (!showBilling) setShowAnalytics(false)
                      }}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      {showBilling ? "Hide Billing" : "Show Billing"}
                    </Button>

                    <Button
                      variant={showAnalytics ? "default" : "outline"}
                      onClick={() => {
                        setShowAnalytics(!showAnalytics)
                        if (!showAnalytics) setShowBilling(false)
                      }}
                    >
                      <BarChart2 className="mr-2 h-4 w-4" />
                      {showAnalytics ? "Hide Analytics" : "Show Analytics"}
                    </Button>

                    <Button variant="outline" onClick={() => setIsMemberDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Add Member
                    </Button>

                    <Button onClick={() => setIsTaskDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isArchived && (
              <Alert variant="warning" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This project is archived. Tasks cannot be modified while the project is archived.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-4 mb-6">
              <p className="text-gray-500">{project.description}</p>

              {project.deadline && (
                <div className="flex items-center">
                  <Calendar
                    className={`h-4 w-4 mr-2 ${
                      deadlineStatus === "overdue"
                        ? "text-red-500"
                        : deadlineStatus === "today"
                          ? "text-amber-500"
                          : "text-gray-500"
                    }`}
                  />
                  <span
                    className={`${
                      deadlineStatus === "overdue"
                        ? "text-red-500 font-medium"
                        : deadlineStatus === "today"
                          ? "text-amber-500 font-medium"
                          : "text-gray-500"
                    }`}
                  >
                    Project Deadline: {format(new Date(project.deadline), "MMMM d, yyyy")}
                    {deadlineStatus === "overdue" && " (Overdue)"}
                    {deadlineStatus === "today" && " (Today)"}
                  </span>
                </div>
              )}
            </div>

            {/* Billing Section (only visible to admins and project managers) */}
            {(isAdmin || isProjectAdmin || isProjectManager) && showBilling && !isArchived && (
              <div className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Billing</CardTitle>
                    <CardDescription>Manage billing and compensation for {project.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProjectBilling project={project} currentUser={user} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Project Analytics (only visible to admins and project managers) */}
            {(isAdmin || isProjectAdmin || isProjectManager) && showAnalytics && !isArchived && (
              <div className="mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Analytics</CardTitle>
                    <CardDescription>Detailed analytics for {project.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProjectAnalytics project={project} tasks={tasks} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Team Members Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Team Members</h2>
                {/* Remove the duplicate Add Member button here */}
              </div>

              {project.members && project.members.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{member.name}</span>
                      {member.projectRole === "admin" && (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                      {member.projectRole === "project-manager" && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                          Project Manager
                        </span>
                      )}
                      {member.projectRole === "developer" && (
                        <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
                          Developer
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="ml-2 text-sm text-gray-500">No team members yet. Add members to collaborate.</p>
                </div>
              )}
            </div>

            <KanbanBoard
              tasks={tasks}
              onMoveTask={isArchived ? undefined : handleMoveTask}
              projectId={projectId}
              currentUser={user}
              onTaskDeleted={handleTaskDeleted}
              isProjectArchived={isArchived}
            />
          </div>
        </main>

        <CreateTaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          projectId={projectId}
          onCreateTask={handleCreateTask}
          teamMembers={project.members || []}
        />

        <AddTeamMemberDialog
          open={isMemberDialogOpen}
          onOpenChange={setIsMemberDialogOpen}
          projectId={projectId}
          onAddMember={handleAddMember}
        />
      </div>
    </DndProvider>
  )
}

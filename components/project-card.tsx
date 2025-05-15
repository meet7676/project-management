"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Archive, ArchiveRestore, Calendar } from "lucide-react"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { deleteProject, updateProjectStatus } from "@/lib/projects"
import { ProjectMembers } from "./project-members"
import { showToast } from "@/lib/utils"
import type { Project, User } from "@/types"
import { formatDistanceToNow, format, isPast, isToday } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface ProjectCardProps {
  project: Project
  onClick: () => void
  currentUser: User
  onProjectDeleted: () => void
  onProjectStatusChanged: () => void
}

export function ProjectCard({
  project,
  onClick,
  currentUser,
  onProjectDeleted,
  onProjectStatusChanged,
}: ProjectCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  // Add state for tracking if the card is being clicked
  const [isNavigating, setIsNavigating] = useState(false)

  const canManageProject =
    currentUser.role === "admin" || project.adminId === currentUser.$id || currentUser.role === "project-manager"

  const isArchived = project.status === "archived"

  // Update handleCardClick to show loading state
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking on dropdown
    if ((e.target as HTMLElement).closest("[data-dropdown]")) {
      e.stopPropagation()
      return
    }
    setIsNavigating(true)
    onClick()
  }

  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true)
      await deleteProject(project.$id)
      onProjectDeleted()
      showToast.success("Project deleted successfully")
    } catch (error) {
      console.error("Error deleting project:", error)
      showToast.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleArchive = async () => {
    try {
      setIsUpdatingStatus(true)
      const newStatus = isArchived ? "active" : "archived"
      await updateProjectStatus(project.$id, newStatus)
      showToast.success(`Project ${isArchived ? "restored" : "archived"} successfully`)
      onProjectStatusChanged()
    } catch (error) {
      console.error("Error updating project status:", error)
      showToast.error(error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Determine deadline status
  const getDeadlineStatus = () => {
    if (!project.deadline) return null

    const deadlineDate = new Date(project.deadline)

    if (isPast(deadlineDate) && !isToday(deadlineDate) && project.status !== "archived") {
      return "overdue"
    } else if (isToday(deadlineDate) && project.status !== "archived") {
      return "today"
    }
    return "upcoming"
  }

  const deadlineStatus = getDeadlineStatus()

  return (
    <>
      <Card
        className={`overflow-hidden transition-all hover:shadow-md cursor-pointer ${
          isArchived ? "bg-gray-50 dark:bg-gray-800/50 opacity-75" : ""
        } ${
          deadlineStatus === "overdue"
            ? "border-red-500 dark:border-red-700"
            : deadlineStatus === "today"
              ? "border-amber-500 dark:border-amber-700"
              : ""
        }`}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2 flex flex-row justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{project.name}</CardTitle>
              {isArchived && (
                <Badge variant="outline" className="ml-2">
                  Archived
                </Badge>
              )}
            </div>
            <CardDescription>{project.description}</CardDescription>
          </div>

          {canManageProject && (
            <div data-dropdown onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleArchive}>
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        <span>Restore Project</span>
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        <span>Archive Project</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <div className="flex items-center text-sm text-gray-500">
              <span>{project.taskCount || 0} tasks</span>
              <span className="mx-2">•</span>
              <span>Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
            </div>

            {project.deadline && (
              <div className="flex items-center text-sm">
                <Calendar
                  className={`h-3.5 w-3.5 mr-1 ${
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
                  Due {format(new Date(project.deadline), "MMM d, yyyy")}
                  {deadlineStatus === "overdue" && " (Overdue)"}
                  {deadlineStatus === "today" && " (Today)"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 dark:bg-gray-800/50 pt-2">
          <div className="flex w-full justify-between items-center">
            <ProjectMembers members={project.members || []} adminId={project.adminId} maxDisplay={3} />
            <div className="text-sm font-medium">
              {project.status === "active" ? (
                <span className="text-green-500">Active</span>
              ) : (
                <span className="text-gray-500">Archived</span>
              )}
            </div>
          </div>
        </CardFooter>
        {isNavigating && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}
      </Card>

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? All tasks will be permanently deleted. This action cannot be undone."
        onConfirm={handleDeleteProject}
        isDeleting={isDeleting}
      />
    </>
  )
}

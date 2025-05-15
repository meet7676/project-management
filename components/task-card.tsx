"use client"

import { useDrag } from "react-dnd"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MoreHorizontal, UserPlus, UserX, Trash2, Loader2, Calendar } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { deleteTask } from "@/lib/projects"
import { showToast } from "@/lib/utils"
import { format, isPast, isToday } from "date-fns"
import type { Task, User } from "@/types"

interface TaskCardProps {
  task: Task
  onAssignTask?: (taskId: string) => void
  currentUser: User
  onTaskDeleted: () => void
  isMoving?: boolean
  isDraggable?: boolean
  isProjectArchived?: boolean
}

export function TaskCard({
  task,
  onAssignTask,
  currentUser,
  onTaskDeleted,
  isMoving = false,
  isDraggable = true,
  isProjectArchived = false,
}: TaskCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [{ isDragging }, drag] = useDrag({
    type: "task",
    item: { id: task.$id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: isDraggable && !isMoving && !isProjectArchived, // Disable dragging when task is being moved or project is archived
  })

  const canManageTask =
    currentUser.role === "admin" ||
    currentUser.role === "project-manager" ||
    task.createdBy === currentUser.$id ||
    task.assigneeId === currentUser.$id

  const handleDeleteTask = async () => {
    try {
      setIsDeleting(true)
      await deleteTask(task.$id)
      onTaskDeleted()
      showToast.success("Task deleted successfully")
    } catch (error) {
      console.error("Error deleting task:", error)
      showToast.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Determine deadline status
  const getDeadlineStatus = () => {
    if (!task.deadline) return null

    const deadlineDate = new Date(task.deadline)

    if (isPast(deadlineDate) && !isToday(deadlineDate) && task.status !== "done") {
      return "overdue"
    } else if (isToday(deadlineDate) && task.status !== "done") {
      return "today"
    }
    return "upcoming"
  }

  const deadlineStatus = getDeadlineStatus()

  return (
    <>
      <Card
        ref={drag}
        className={`
         ${isDragging ? "opacity-50" : ""} 
         ${isMoving ? "opacity-70 cursor-not-allowed" : isDraggable && !isProjectArchived ? "cursor-grab hover:shadow-md" : "cursor-default"} 
         ${isProjectArchived ? "opacity-80" : ""}
         ${deadlineStatus === "overdue" ? "border-red-500 dark:border-red-700" : ""}
         ${deadlineStatus === "today" ? "border-amber-500 dark:border-amber-700" : ""}
         transition-all relative
       `}
      >
        {isMoving && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        <CardHeader className="p-3 pb-0 flex flex-row justify-between items-start">
          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
          {canManageTask && !isMoving && !isProjectArchived && (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onAssignTask && (
                  <DropdownMenuItem onClick={() => onAssignTask(task.$id)}>
                    {task.assignee ? (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        <span>Reassign Task</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        <span>Assign Task</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {(currentUser.role === "admin" ||
                  currentUser.role === "project-manager" ||
                  task.createdBy === currentUser.$id) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span>Delete Task</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}

          {task.deadline && (
            <div className="mt-2 flex items-center text-xs">
              <Calendar
                className={`h-3 w-3 mr-1 ${
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
                {format(new Date(task.deadline), "MMM d, yyyy")}
                {deadlineStatus === "overdue" && " (Overdue)"}
                {deadlineStatus === "today" && " (Today)"}
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-between items-center">
          <Badge
            variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "outline"}
            className="text-xs"
          >
            {task.priority}
          </Badge>

          {task.assignee ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6 cursor-help">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assigned to: {task.assignee.name}</p>
                  <p className="text-xs text-muted-foreground">{task.assignee.projectRole}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-6 w-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-help">
                    <UserPlus className="h-3 w-3 text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unassigned</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardFooter>
      </Card>

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={handleDeleteTask}
        isDeleting={isDeleting}
      />
    </>
  )
}

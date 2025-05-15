"use client"

import { useMemo, useState } from "react"
import { KanbanColumn } from "@/components/kanban-column"
import { AssignTaskDialog } from "@/components/assign-task-dialog"
import { updateTaskAssignee } from "@/lib/projects"
import { showToast } from "@/lib/utils"
import type { Task, User } from "@/types"

interface KanbanBoardProps {
  tasks: Task[]
  onMoveTask?: (taskId: string, newStatus: string) => Promise<void>
  projectId: string
  currentUser: User
  onTaskDeleted: () => void
  isProjectArchived?: boolean
}

export function KanbanBoard({
  tasks,
  onMoveTask,
  projectId,
  currentUser,
  onTaskDeleted,
  isProjectArchived = false,
}: KanbanBoardProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)

  const columns = useMemo(() => {
    const todoTasks = tasks.filter((task) => task.status === "todo")
    const inProgressTasks = tasks.filter((task) => task.status === "in-progress")
    const doneTasks = tasks.filter((task) => task.status === "done")

    return [
      { id: "todo", title: "To Do", tasks: todoTasks },
      { id: "in-progress", title: "In Progress", tasks: inProgressTasks },
      { id: "done", title: "Done", tasks: doneTasks },
    ]
  }, [tasks])

  const handleAssignTask = (taskId: string) => {
    // Don't allow task assignment if project is archived
    if (isProjectArchived) return

    // Check if user has permission to assign this task
    const task = tasks.find((t) => t.$id === taskId) || null

    if (!task) return

    // Only admins, task creators, or the assigned user can reassign
    if (currentUser.role !== "admin" && task.createdBy !== currentUser.$id && task.assigneeId !== currentUser.$id) {
      showToast.error("You don't have permission to assign this task")
      return
    }

    setSelectedTask(task)
    setSelectedTaskId(taskId)
    setAssignDialogOpen(true)
  }

  const handleAssigneeChange = async (userId: string | null) => {
    if (!selectedTaskId) return

    try {
      await updateTaskAssignee(selectedTaskId, userId)
      // Trigger a refresh of the tasks
      window.dispatchEvent(new CustomEvent("refresh-tasks"))
      showToast.success(userId ? "Task assigned successfully" : "Task unassigned successfully")
    } catch (error) {
      console.error("Error assigning task:", error)
      showToast.error(error)
    } finally {
      setAssignDialogOpen(false)
      setSelectedTaskId(null)
      setSelectedTask(null)
    }
  }

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    if (!onMoveTask || isProjectArchived) return

    setMovingTaskId(taskId)
    try {
      await onMoveTask(taskId, newStatus)
    } finally {
      setMovingTaskId(null)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={column.tasks}
            onMoveTask={onMoveTask ? handleMoveTask : undefined}
            onAssignTask={handleAssignTask}
            currentUser={currentUser}
            onTaskDeleted={onTaskDeleted}
            movingTaskId={movingTaskId}
            isProjectArchived={isProjectArchived}
          />
        ))}
      </div>

      <AssignTaskDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        projectId={projectId}
        taskId={selectedTaskId || undefined}
        currentAssignee={selectedTask?.assignee || null}
        onAssign={handleAssigneeChange}
      />
    </>
  )
}

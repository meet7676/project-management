"use client"

import { useDrop } from "react-dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskCard } from "@/components/task-card"
import type { Task, User } from "@/types"

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  onMoveTask?: (taskId: string, newStatus: string) => void
  onAssignTask?: (taskId: string) => void
  currentUser: User
  onTaskDeleted: () => void
  movingTaskId: string | null
  isProjectArchived?: boolean
}

export function KanbanColumn({
  id,
  title,
  tasks,
  onMoveTask,
  onAssignTask,
  currentUser,
  onTaskDeleted,
  movingTaskId,
  isProjectArchived = false,
}: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: "task",
    drop: (item: { id: string }) => {
      if (onMoveTask) {
        onMoveTask(item.id, id)
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
    canDrop: () => !isProjectArchived && !!onMoveTask,
  })

  return (
    <div
      ref={drop}
      className={`flex flex-col h-[calc(100vh-220px)] ${
        isOver ? "bg-gray-100 dark:bg-gray-800" : ""
      } rounded-lg transition-colors ${isProjectArchived ? "opacity-80" : ""}`}
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 w-6 h-6 text-sm">
              {tasks.length}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-2">
            {tasks.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed p-4 text-sm text-gray-500">
                No tasks
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.$id}
                  task={task}
                  onAssignTask={onAssignTask && !isProjectArchived ? () => onAssignTask(task.$id) : undefined}
                  currentUser={currentUser}
                  onTaskDeleted={onTaskDeleted}
                  isMoving={movingTaskId === task.$id}
                  isDraggable={!isProjectArchived && !!onMoveTask}
                  isProjectArchived={isProjectArchived}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

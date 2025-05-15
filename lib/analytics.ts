import type { Project, Task } from "@/types"

// User Analytics
export function calculateUserAnalytics(projects: Project[], allTasks: Task[][] = []) {
  // Flatten all tasks
  const tasks = allTasks.flat()

  // Calculate basic metrics
  const totalProjects = projects.length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === "done").length
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length
  const todoTasks = tasks.filter((task) => task.status === "todo").length

  // Calculate completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate task distribution
  const taskDistribution = [
    { name: "To Do", value: todoTasks, color: "#94a3b8" },
    { name: "In Progress", value: inProgressTasks, color: "#3b82f6" },
    { name: "Done", value: completedTasks, color: "#22c55e" },
  ]

  // Calculate projects by status
  const activeProjects = projects.filter((project) => project.status === "active").length
  const archivedProjects = projects.filter((project) => project.status === "archived").length

  const projectStatusDistribution = [
    { name: "Active", value: activeProjects, color: "#22c55e" },
    { name: "Archived", value: archivedProjects, color: "#94a3b8" },
  ]

  // Calculate task priority distribution
  const highPriorityTasks = tasks.filter((task) => task.priority === "high").length
  const mediumPriorityTasks = tasks.filter((task) => task.priority === "medium").length
  const lowPriorityTasks = tasks.filter((task) => task.priority === "low").length

  const priorityDistribution = [
    { name: "High", value: highPriorityTasks, color: "#ef4444" },
    { name: "Medium", value: mediumPriorityTasks, color: "#f59e0b" },
    { name: "Low", value: lowPriorityTasks, color: "#22c55e" },
  ]

  // Calculate unassigned vs assigned tasks
  const assignedTasks = tasks.filter((task) => task.assigneeId).length
  const unassignedTasks = tasks.filter((task) => !task.assigneeId).length

  const assignmentDistribution = [
    { name: "Assigned", value: assignedTasks, color: "#3b82f6" },
    { name: "Unassigned", value: unassignedTasks, color: "#94a3b8" },
  ]

  return {
    totalProjects,
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    completionRate,
    taskDistribution,
    projectStatusDistribution,
    priorityDistribution,
    assignmentDistribution,
  }
}

// Project Analytics
export function calculateProjectAnalytics(project: Project, tasks: Task[]) {
  // Calculate basic metrics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === "done").length
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length
  const todoTasks = tasks.filter((task) => task.status === "todo").length

  // Calculate completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate task distribution
  const taskDistribution = [
    { name: "To Do", value: todoTasks, color: "#94a3b8" },
    { name: "In Progress", value: inProgressTasks, color: "#3b82f6" },
    { name: "Done", value: completedTasks, color: "#22c55e" },
  ]

  // Calculate task priority distribution
  const highPriorityTasks = tasks.filter((task) => task.priority === "high").length
  const mediumPriorityTasks = tasks.filter((task) => task.priority === "medium").length
  const lowPriorityTasks = tasks.filter((task) => task.priority === "low").length

  const priorityDistribution = [
    { name: "High", value: highPriorityTasks, color: "#ef4444" },
    { name: "Medium", value: mediumPriorityTasks, color: "#f59e0b" },
    { name: "Low", value: lowPriorityTasks, color: "#22c55e" },
  ]

  // Calculate assignee distribution
  const assigneeMap = new Map<string, number>()
  const unassignedCount = tasks.filter((task) => !task.assigneeId).length

  tasks.forEach((task) => {
    if (task.assigneeId && task.assignee) {
      const assigneeId = task.assigneeId
      assigneeMap.set(assigneeId, (assigneeMap.get(assigneeId) || 0) + 1)
    }
  })

  const assigneeDistribution = Array.from(assigneeMap.entries()).map(([id, count]) => {
    const assignee = tasks.find((task) => task.assigneeId === id)?.assignee
    return {
      name: assignee?.name || "Unknown",
      value: count,
      id,
    }
  })

  if (unassignedCount > 0) {
    assigneeDistribution.push({
      name: "Unassigned",
      value: unassignedCount,
      id: "unassigned",
    })
  }

  // Calculate task completion over time (last 7 days)
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split("T")[0]
  })

  const completionOverTime = last7Days.map((date) => {
    // Count tasks completed on this date
    const completedOnDate = tasks.filter((task) => {
      // This is a simplification - in a real app, you'd track when a task was marked as done
      // For now, we'll use createdAt as a proxy
      const taskDate = new Date(task.createdAt).toISOString().split("T")[0]
      return taskDate === date && task.status === "done"
    }).length

    return {
      date,
      completed: completedOnDate,
    }
  })

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    completionRate,
    taskDistribution,
    priorityDistribution,
    assigneeDistribution,
    completionOverTime,
  }
}

// Helper function to format date for charts
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Project, Task } from "@/types"

interface ProjectAnalyticsProps {
  project: Project
  tasks: Task[]
}

export function ProjectAnalytics({ project, tasks }: ProjectAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // Calculate basic metrics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === "done").length
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length
  const todoTasks = tasks.filter((task) => task.status === "todo").length

  // Calculate completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Task status distribution
  const taskStatusData = [
    { name: "To Do", value: todoTasks, color: "#94a3b8" },
    { name: "In Progress", value: inProgressTasks, color: "#3b82f6" },
    { name: "Done", value: completedTasks, color: "#22c55e" },
  ]

  // Task priority distribution
  const highPriorityTasks = tasks.filter((task) => task.priority === "high").length
  const mediumPriorityTasks = tasks.filter((task) => task.priority === "medium").length
  const lowPriorityTasks = tasks.filter((task) => task.priority === "low").length

  const priorityData = [
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

  const assigneeData = Array.from(assigneeMap.entries()).map(([id, count]) => {
    const assignee = tasks.find((task) => task.assigneeId === id)?.assignee
    return {
      name: assignee?.name || "Unknown",
      value: count,
      id,
    }
  })

  if (unassignedCount > 0) {
    assigneeData.push({
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
      const taskDate = new Date(task.createdAt).toISOString().split("T")[0]
      return taskDate === date && task.status === "done"
    }).length

    return {
      date,
      completed: completedOnDate,
    }
  })

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Colors for charts
  const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#06b6d4", "#84cc16"]

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTasks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedTasks}</div>
                <p className="text-xs text-muted-foreground">{inProgressTasks} in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionRate}%</div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${completionRate}%` }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Task Distribution</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {totalTasks > 0 ? (
                  <div className="h-[80px] w-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={40}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {taskStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No tasks yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {totalTasks > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskStatusData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`${value} tasks`, "Count"]}
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          borderColor: "var(--border)",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Bar dataKey="value" name="Tasks">
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No tasks to display</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Task Completion Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {totalTasks > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={completionOverTime}>
                      <XAxis dataKey="date" tickFormatter={formatDate} />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => formatDate(value as string)}
                        formatter={(value) => [`${value} tasks`, "Completed"]}
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          borderColor: "var(--border)",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        name="Completed Tasks"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">No tasks to display</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {totalTasks > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} tasks`, "Count"]}
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No tasks to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Distribution by Team Member</CardTitle>
              <CardDescription>Number of tasks assigned to each team member</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {assigneeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assigneeData} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip
                      formatter={(value) => [`${value} tasks`, "Assigned"]}
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="value" name="Tasks">
                      {assigneeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No assigned tasks to display</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assigneeData
              .filter((assignee) => assignee.id !== "unassigned")
              .map((assignee, index) => (
                <Card key={assignee.id}>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Avatar className="h-9 w-9 mr-2">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-medium">{assignee.name}</CardTitle>
                      <CardDescription>Team Member</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{assignee.value}</div>
                    <p className="text-xs text-muted-foreground">Assigned tasks</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

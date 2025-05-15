"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, BarChart2 } from "lucide-react"
import { getCurrentUser } from "@/lib/appwrite"
import { ProjectCard } from "@/components/project-card"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { DashboardHeader } from "@/components/dashboard-header"
import { UserAnalyticsDashboard } from "@/components/user-analytics-dashboard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Project, Task, User } from "@/types"
import { getProjects, getTasks } from "@/lib/projects"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [allTasks, setAllTasks] = useState<Task[][]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  const fetchProjects = async () => {
    try {
      const userProjects = await getProjects()
      setProjects(userProjects)

      // Fetch tasks for each project for analytics
      const tasksPromises = userProjects.map((project) => getTasks(project.$id))
      const tasksResults = await Promise.all(tasksPromises)
      setAllTasks(tasksResults)

      setIsLoadingAnalytics(false)
    } catch (error) {
      console.error("Error fetching projects:", error)
      setIsLoadingAnalytics(false)
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

        await fetchProjects()
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleCreateProject = async (newProject: Project) => {
    setProjects([...projects, newProject])
    setIsDialogOpen(false)

    // Refresh projects to get updated data for analytics
    await fetchProjects()
  }

  const handleProjectDeleted = async () => {
    await fetchProjects()
  }

  const handleProjectStatusChanged = async () => {
    await fetchProjects()
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // Filter projects based on the active tab
  const filteredProjects = projects.filter((project) => {
    if (activeTab === "all") return true
    if (activeTab === "active") return project.status === "active"
    if (activeTab === "archived") return project.status === "archived"
    return true
  })
  // Count projects by status
  const activeProjectsCount = projects.filter((p) => p.status === "active").length
  const archivedProjectsCount = projects.filter((p) => p.status === "archived").length

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />
      <main className="flex-1 p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAnalytics(!showAnalytics)}>
                <BarChart2 className="mr-2 h-4 w-4" />
                {showAnalytics ? "Hide Analytics" : "Show Analytics"}
              </Button>
              {(user?.labels[0] === "admin" || user?.labels[0] === "projectManager") && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
              )}
            </div>
          </div>

          {showAnalytics && (
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>Overview of your projects and tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAnalytics ? (
                    <div className="flex h-40 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                  ) : (
                    <UserAnalyticsDashboard projects={projects} allTasks={allTasks} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your Projects</h2>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">All ({projects.length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({activeProjectsCount})</TabsTrigger>
                  <TabsTrigger value="archived">Archived ({archivedProjectsCount})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {filteredProjects.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {activeTab === "all"
                      ? "No projects yet"
                      : activeTab === "active"
                        ? "No active projects"
                        : "No archived projects"}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === "all" || activeTab === "active"
                      ? "Create your first project to get started"
                      : "Archive projects to see them here"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeTab === "all" || activeTab === "active" ? (
                    <Button
                      onClick={() => setIsDialogOpen(true)}
                      disabled={!(user?.labels[0] === "admin" || user?.labels[0] === "projectManager")}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create Project
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.$id}
                    project={project}
                    onClick={() => router.push(`/project/${project.$id}`)}
                    currentUser={user!}
                    onProjectDeleted={handleProjectDeleted}
                    onProjectStatusChanged={handleProjectStatusChanged}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onCreateProject={handleCreateProject} />
    </div>
  )
}

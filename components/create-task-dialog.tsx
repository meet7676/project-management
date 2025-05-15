"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTask, getProject } from "@/lib/projects"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Calendar, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Task, Project } from "@/types"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onCreateTask: (task: Task) => void
  teamMembers?: { id: string; name: string; role?: string; projectRole?: string }[]
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  onCreateTask,
  teamMembers = [],
}: CreateTaskDialogProps) {
  // Add compensation field to the form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigneeId: "",
    deadline: null as Date | null,
    compensation: "" as string | number, // New field for compensation
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [project, setProject] = useState<Project | null>(null)

  // Fetch project details to get default compensation
  useEffect(() => {
    const fetchProject = async () => {
      if (open && projectId) {
        try {
          const projectData = await getProject(projectId)
          setProject(projectData)
          // Set default compensation from project settings
          setFormData((prev) => ({
            ...prev,
            compensation: projectData.defaultTaskCompensation || 0,
          }))
        } catch (error) {
          console.error("Error fetching project:", error)
        }
      }
    }

    fetchProject()
  }, [open, projectId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  // Add handleDateChange function
  const handleDateChange = (date: Date | null) => {
    setFormData({
      ...formData,
      deadline: date,
    })
  }

  // Update handleSubmit to include compensation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const deadlineString = formData.deadline ? formData.deadline.toISOString() : null
      const compensation = formData.compensation === "" ? undefined : Number.parseFloat(formData.compensation as string)

      const newTask = await createTask(
        projectId,
        formData.title,
        formData.description,
        formData.status,
        formData.priority,
        deadlineString,
        formData.assigneeId === "unassigned" ? null : formData.assigneeId,
        compensation, // Pass compensation to createTask
      )
      onCreateTask(newTask)
      setFormData({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assigneeId: "",
        deadline: null,
        compensation: project?.defaultTaskCompensation || 0,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating task:", error)
      setError(typeof error === "string" ? error : error.message || "Failed to create task. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setFormData({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assigneeId: "",
        deadline: null,
        compensation: project?.defaultTaskCompensation || 0,
      })
      setError("")
    }
    onOpenChange(open)
  }

  // Filter team members to only show developers for assignment
  const developers = teamMembers.filter((member) => member.projectRole === "developer")

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to your project</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Design homepage"
                required
                value={formData.title}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provide details about this task"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Add compensation field */}
            <div className="grid gap-2">
              <Label htmlFor="compensation">Compensation</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                </span>
                <Input
                  id="compensation"
                  name="compensation"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={project?.defaultTaskCompensation?.toString() || "0"}
                  value={formData.compensation}
                  onChange={handleChange}
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Amount paid for completing this task ({project?.currency || "USD"})
              </p>
            </div>
            {/* Add deadline field to the form UI */}
            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" id="deadline">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, "PPP") : <span>Select a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.deadline || undefined}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={formData.assigneeId} onValueChange={(value) => handleSelectChange("assigneeId", value)}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Assign to developer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {developers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

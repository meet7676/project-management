"use client"

import type React from "react"

import { useState } from "react"
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
import { createProject, searchUsersByEmail } from "@/lib/projects"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { X, UserPlus, Loader2, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { showToast } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Project, User } from "@/types"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (project: Project) => void
}

export function CreateProjectDialog({ open, onOpenChange, onCreateProject }: CreateProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const [searchError, setSearchError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    deadline: null as Date | null,
  })
  const [searchEmail, setSearchEmail] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleDateChange = (date: Date | null) => {
    setFormData({
      ...formData,
      deadline: date,
    })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmail(e.target.value)
    setSearchError("")
  }

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchEmail.trim()) return

    setIsSearching(true)
    setSearchError("")

    try {
      const users = await searchUsersByEmail(searchEmail)

      if (users.length === 0) {
        setSearchError("No user found with this email")
        return
      }

      const user = users[0]

      // Check if user is already added
      if (selectedMembers.some((member) => member.$id === user.$id)) {
        setSearchError("This user is already added to the project")
        return
      }

      setSelectedMembers([
        ...selectedMembers,
        {
          $id: user.$id,
          name: user.name,
          email: user.email,
          role: user.role || "developer",
        },
      ])

      setSearchEmail("")
    } catch (error) {
      console.error("Error searching user:", error)
      setSearchError("Failed to search for user")
    } finally {
      setIsSearching(false)
    }
  }

  const removeMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter((member) => member.$id !== userId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Extract member IDs
      const memberIds = selectedMembers.map((member) => member.$id)
      const deadlineString = formData.deadline ? formData.deadline.toISOString() : null

      const newProject = await createProject(formData.name, formData.description, deadlineString, memberIds)
      onCreateProject(newProject)

      // Reset form
      setFormData({ name: "", description: "", deadline: null })
      setSelectedMembers([])

      showToast.success("Project created successfully")
    } catch (error) {
      console.error("Error creating project:", error)
      setError(typeof error === "string" ? error : error.message || "Failed to create project")
      showToast.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Reset form when dialog closes
      setFormData({ name: "", description: "", deadline: null })
      setSelectedMembers([])
      setSearchEmail("")
      setError("")
      setSearchError("")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Create a new project to organize your tasks</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Marketing Campaign"
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="A brief description of your project"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deadline">Project Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" id="deadline">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, "PPP") : <span>Select a deadline (optional)</span>}
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
              <Label>Team Members</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedMembers.length > 0 ? (
                  selectedMembers.map((member) => (
                    <div
                      key={member.$id}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                        {member.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMember(member.$id)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {member.name}</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No team members added yet. You'll be added automatically as the admin.
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="Add member by email" value={searchEmail} onChange={handleSearchChange} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchUser}
                  disabled={isSearching || !searchEmail.trim()}
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </div>

              {searchError && <p className="text-sm text-red-500">{searchError}</p>}

              <p className="text-xs text-gray-500">Team members must already have accounts in the system.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

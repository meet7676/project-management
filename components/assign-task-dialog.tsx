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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getProject } from "@/lib/projects"
import { UserX } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { ProjectMember } from "@/types"

interface AssignTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  taskId?: string
  currentAssignee?: ProjectMember | null
  onAssign: (userId: string | null) => void
}

export function AssignTaskDialog({
  open,
  onOpenChange,
  projectId,
  taskId,
  currentAssignee,
  onAssign,
}: AssignTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([])

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!projectId || !open) return

      try {
        setIsLoading(true)
        setError("")
        const project = await getProject(projectId)
        if (project && project.members) {
          setTeamMembers(project.members)
        }
      } catch (error) {
        console.error("Error fetching team members:", error)
        setError("Failed to load team members. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeamMembers()

    // Set the current assignee when dialog opens
    if (open && currentAssignee) {
      setSelectedUserId(currentAssignee.id)
    } else {
      setSelectedUserId(null)
    }
  }, [projectId, open, currentAssignee])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAssign(selectedUserId)
    onOpenChange(false)
  }

  const handleSelectChange = (value: string) => {
    setSelectedUserId(value === "unassigned" ? null : value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>Select a team member to assign this task to</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <Select value={selectedUserId || "unassigned"} onValueChange={handleSelectChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-muted-foreground" />
                      <span>Unassigned</span>
                    </SelectItem>

                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({member.projectRole})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentAssignee && (
                  <div className="text-sm text-muted-foreground">
                    Currently assigned to: <span className="font-medium">{currentAssignee.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {selectedUserId ? "Assign" : "Unassign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

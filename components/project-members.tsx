"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UserPlus } from "lucide-react"
import type { ProjectMember } from "@/types"

interface ProjectMembersProps {
  members: ProjectMember[]
  adminId?: string
  maxDisplay?: number
  showAddButton?: boolean
  onAddClick?: () => void
  size?: "sm" | "md" | "lg"
}

export function ProjectMembers({
  members,
  adminId,
  maxDisplay = 3,
  showAddButton = false,
  onAddClick,
  size = "md",
}: ProjectMembersProps) {
  // Size classes
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  }

  const avatarSize = sizeClasses[size]
  const borderClass = "border-2 border-background"

  // If no members, show empty state
  if (members.length === 0) {
    return (
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`${avatarSize} rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-help`}
              >
                <UserPlus className="h-3 w-3 text-gray-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>No team members</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {showAddButton && (
          <button onClick={onAddClick} className="ml-2 text-xs text-primary hover:underline">
            Add members
          </button>
        )}
      </div>
    )
  }

  // Display members with avatars
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {members?.slice(0, maxDisplay)?.map((member) => (
          <TooltipProvider key={member.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className={`${avatarSize} ${borderClass}`}>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {member?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <p>{member?.name}</p>
                  <span className="text-xs text-gray-500">{member?.projectRole}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {members.length > maxDisplay && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${avatarSize} ${borderClass} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs`}
                >
                  +{members.length - maxDisplay}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{members.length - maxDisplay} more team members</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {showAddButton && (
        <button onClick={onAddClick} className="ml-2 text-xs text-primary hover:underline">
          Add more
        </button>
      )}
    </div>
  )
}

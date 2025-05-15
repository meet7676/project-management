import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface RoleBadgeProps {
  role: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function RoleBadge({ role, className, size = "md" }: RoleBadgeProps) {
  // Normalize role name for display
  const normalizedRole = role === "projectManager" ? "Project Manager" : role.charAt(0).toUpperCase() + role.slice(1)

  // Determine badge variant based on role
  const variant = role === "admin" ? "destructive" : role === "projectManager" ? "default" : "secondary"

  // Size classes
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  }

  return (
    <Badge variant={variant} className={cn(sizeClasses[size], "font-medium rounded-sm", className)}>
      {normalizedRole}
    </Badge>
  )
}

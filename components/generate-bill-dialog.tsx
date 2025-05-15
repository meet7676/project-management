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
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { getUnbilledTasks, generateBill } from "@/lib/billing"
import { showToast } from "@/lib/utils"
import type { ProjectMember, Task } from "@/types"

interface GenerateBillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  developerId: string
  developer: ProjectMember | undefined
  currency: string
  onBillGenerated: () => void
}

export function GenerateBillDialog({
  open,
  onOpenChange,
  projectId,
  developerId,
  developer,
  currency,
  onBillGenerated,
}: GenerateBillDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [unbilledTasks, setUnbilledTasks] = useState<Task[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [notes, setNotes] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (open && developerId) {
      fetchUnbilledTasks()
    }
  }, [open, developerId, projectId])

  const fetchUnbilledTasks = async () => {
    try {
      setIsLoading(true)
      const tasks = await getUnbilledTasks(projectId, developerId)
      setUnbilledTasks(tasks)

      // Select all tasks by default
      const taskIds = tasks.map((task) => task.$id)
      setSelectedTaskIds(taskIds)

      // Calculate total amount
      const total = tasks.reduce((sum, task) => sum + (task.compensation || 0), 0)
      setTotalAmount(Math.round(total)) // Ensure amount is an integer
    } catch (error) {
      console.error("Error fetching unbilled tasks:", error)
      showToast.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskSelection = (taskId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedTaskIds([...selectedTaskIds, taskId])
    } else {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId))
    }
  }

  useEffect(() => {
    // Recalculate total amount when selected tasks change
    const total = unbilledTasks
      .filter((task) => selectedTaskIds.includes(task.$id))
      .reduce((sum, task) => sum + (task.compensation || 0), 0)
    setTotalAmount(Math.round(total)) // Ensure amount is an integer
  }, [selectedTaskIds, unbilledTasks])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalAmount(Math.round(Number.parseFloat(e.target.value) || 0)) // Ensure amount is an integer
  }

  const handleGenerateBill = async () => {
    if (selectedTaskIds.length === 0) {
      showToast.error("Please select at least one task")
      return
    }

    try {
      setIsGenerating(true)
      await generateBill(
        projectId,
        developerId,
        developer?.name || "Unknown Developer",
        selectedTaskIds,
        totalAmount,
        notes,
        dueDate ? dueDate.toISOString() : undefined,
      )
      onBillGenerated()
    } catch (error) {
      console.error("Error generating bill:", error)
      showToast.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Bill for {developer?.name}</DialogTitle>
          <DialogDescription>Create a bill for completed tasks that haven't been billed yet</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : unbilledTasks.length === 0 ? (
          <div className="py-6 text-center">
            <p>No unbilled tasks available for this developer.</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select Tasks to Include</Label>
              <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                {unbilledTasks.map((task) => (
                  <div key={task.$id} className="flex items-center space-x-2 p-3">
                    <Checkbox
                      id={`task-${task.$id}`}
                      checked={selectedTaskIds.includes(task.$id)}
                      onCheckedChange={(checked) => handleTaskSelection(task.$id, checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`task-${task.$id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {task.title}
                      </label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(task.compensation || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount</Label>
              <Input id="amount" type="number" min="0" step="1" value={totalAmount} onChange={handleAmountChange} />
              <p className="text-sm text-muted-foreground">Default: {formatCurrency(totalAmount)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" id="dueDate">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes for this bill"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateBill} disabled={isGenerating || isLoading || selectedTaskIds.length === 0}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Bill"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

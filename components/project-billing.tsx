"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { DollarSign, FileText, Send, Check, CircleDollarSign, Clock, CreditCard, AlertCircle } from "lucide-react"
import { calculateDeveloperCompensation, getBillsByProject, updateBillStatus, getUnbilledTasks } from "@/lib/billing"
import { updateProjectBillingSettings } from "@/lib/billing"
import { showToast } from "@/lib/utils"
import { GenerateBillDialog } from "./generate-bill-dialog"
import type { Project, Bill, Task } from "@/types"

interface ProjectBillingProps {
  project: Project
  currentUser: any
}

export function ProjectBilling({ project, currentUser }: ProjectBillingProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [developerCompensations, setDeveloperCompensations] = useState<any[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [unbilledTasks, setUnbilledTasks] = useState<Record<string, Task[]>>({})
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  const [isGenerateBillDialogOpen, setIsGenerateBillDialogOpen] = useState(false)
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string | null>(null)
  const [billingSettings, setBillingSettings] = useState({
    defaultTaskCompensation: project.defaultTaskCompensation || 0,
    currency: project.currency || "USD",
    billingCycle: project.billingCycle || "monthly",
  })
  const [billingStats, setBillingStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalUnbilled: 0,
    billsPending: 0,
  })

  // Check if user has permission to manage billing
  const canManageBilling =
    currentUser.role === "admin" || project.adminId === currentUser.$id || currentUser.role === "projectManager"

  useEffect(() => {
    fetchBillingData()
  }, [project.$id])

  const fetchBillingData = async () => {
    try {
      setIsLoading(true)

      // Calculate compensation for each developer
      const compensations = []
      const unbilledTasksMap: Record<string, Task[]> = {}
      let totalPaid = 0
      let totalPending = 0
      let totalUnbilled = 0
      let billsPending = 0

      for (const member of project.members) {
        if (member.projectRole === "developer") {
          const result = await calculateDeveloperCompensation(project.$id, member.id)
          compensations.push({
            developer: member,
            totalCompensation: result.totalCompensation,
            taskCount: result.tasks.length,
            currency: result.currency,
          })

          // Get unbilled tasks for this developer
          const devUnbilledTasks = await getUnbilledTasks(project.$id, member.id)
          if (devUnbilledTasks.length > 0) {
            unbilledTasksMap[member.id] = devUnbilledTasks
            // Calculate total unbilled amount
            const unbilledAmount = devUnbilledTasks.reduce((sum, task) => sum + (task.compensation || 0), 0)
            totalUnbilled += unbilledAmount
          }
        }
      }
      setDeveloperCompensations(compensations)
      setUnbilledTasks(unbilledTasksMap)

      // Get all bills for the project
      const projectBills = await getBillsByProject(project.$id)
      setBills(projectBills)

      // Calculate billing statistics
      projectBills.forEach(bill => {
        if (bill.status === 'paid') {
          totalPaid += bill.amount;
        } else {
          totalPending += bill.amount;
          billsPending++;
        }
      });

      setBillingStats({
        totalPaid,
        totalPending,
        totalUnbilled,
        billsPending,
      });

    } catch (error) {
      console.error("Error fetching billing data:", error)
      showToast.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingsChange = (field: string, value: any) => {
    setBillingSettings({
      ...billingSettings,
      [field]: field === "defaultTaskCompensation" ? Number.parseFloat(value) : value,
    })
  }

  const handleSaveSettings = async () => {
    try {
      setIsUpdatingSettings(true)
      await updateProjectBillingSettings(
        project.$id,
        billingSettings.defaultTaskCompensation,
        billingSettings.currency,
        billingSettings.billingCycle,
      )
      showToast.success("Billing settings updated successfully")
    } catch (error) {
      console.error("Error updating billing settings:", error)
      showToast.error(error)
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  const handleUpdateBillStatus = async (billId: string, status: "draft" | "sent" | "paid") => {
    try {
      await updateBillStatus(billId, status)
      // Refresh bills
      const projectBills = await getBillsByProject(project.$id)
      setBills(projectBills)
      showToast.success(`Bill marked as ${status}`)
    } catch (error) {
      console.error("Error updating bill status:", error)
      showToast.error(error)
    }
  }

  const handleGenerateBill = (developerId: string) => {
    setSelectedDeveloperId(developerId)
    setIsGenerateBillDialogOpen(true)
  }

  const handleBillGenerated = () => {
    setIsGenerateBillDialogOpen(false)
    fetchBillingData()
    showToast.success("Bill generated successfully")
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Analytics-style cards for key billing metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <CircleDollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(billingStats.totalPaid, billingSettings.currency)}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  All time paid amount
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(billingStats.totalPending, billingSettings.currency)}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  From {billingStats.billsPending} unpaid bills
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unbilled Amount</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(billingStats.totalUnbilled, billingSettings.currency)}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  From completed tasks not yet billed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <AlertCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    billingStats.totalPaid + billingStats.totalPending + billingStats.totalUnbilled, 
                    billingSettings.currency
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Project total cost estimation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Unbilled Tasks Section */}
          <Card>
            <CardHeader>
              <CardTitle>Unbilled Completed Tasks</CardTitle>
              <CardDescription>Tasks that are completed but haven't been billed yet</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(unbilledTasks).length === 0 ? (
                <div className="text-center py-4 text-gray-500">No unbilled tasks available</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(unbilledTasks).map(([developerId, tasks]) => {
                    const developer = project.members.find(m => m.id === developerId);
                    const totalAmount = tasks.reduce((sum, task) => sum + (task.compensation || 0), 0);
                    
                    return (
                      <div key={developerId} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-medium">{developer?.name || "Developer"}</h3>
                          {canManageBilling && tasks.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateBill(developerId)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generate Bill ({formatCurrency(totalAmount, billingSettings.currency)})
                            </Button>
                          )}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Task</TableHead>
                              <TableHead>Completed At</TableHead>
                              <TableHead>Compensation</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tasks.map(task => (
                              <TableRow key={task.$id}>
                                <TableCell>
                                  <div className="font-medium">{task.title}</div>
                                  <div className="text-xs text-gray-500 line-clamp-1">{task.description}</div>
                                </TableCell>
                                <TableCell>
                                  {task.completedAt ? format(new Date(task.completedAt), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(task.compensation || 0, billingSettings.currency)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Bills</CardTitle>
                <CardDescription>All bills generated for this project</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No bills generated yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Developer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.$id}>
                        <TableCell className="font-medium">{bill.developerName}</TableCell>
                        <TableCell>{formatCurrency(bill.amount, bill.currency)}</TableCell>
                        <TableCell>{format(new Date(bill.generatedAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.status === "paid" ? "success" : bill.status === "sent" ? "default" : "secondary"
                            }
                          >
                            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManageBilling && (
                            <div className="flex justify-end gap-2">
                              {bill.status === "draft" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleUpdateBillStatus(bill.$id, "sent")}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleUpdateBillStatus(bill.$id, "paid")}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {bill.status === "sent" && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleUpdateBillStatus(bill.$id, "paid")}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Configure billing settings for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTaskCompensation">Default Task Compensation</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                      </span>
                      <Input
                        id="defaultTaskCompensation"
                        type="number"
                        min="0"
                        step="0.01"
                        value={billingSettings.defaultTaskCompensation}
                        onChange={(e) => handleSettingsChange("defaultTaskCompensation", e.target.value)}
                        className="rounded-l-none"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Default amount paid for completing a task in this project
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={billingSettings.currency}
                      onValueChange={(value) => handleSettingsChange("currency", value)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Currency used for billing in this project</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select
                    value={billingSettings.billingCycle}
                    onValueChange={(value) => handleSettingsChange("billingCycle", value)}
                  >
                    <SelectTrigger id="billingCycle">
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="project">Project-based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">How often bills should be generated</p>
                </div>

                <Button onClick={handleSaveSettings} disabled={isUpdatingSettings}>
                  {isUpdatingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedDeveloperId && (
        <GenerateBillDialog
          open={isGenerateBillDialogOpen}
          onOpenChange={setIsGenerateBillDialogOpen}
          projectId={project.$id}
          developerId={selectedDeveloperId}
          developer={project.members.find((m) => m.id === selectedDeveloperId)}
          currency={billingSettings.currency}
          onBillGenerated={handleBillGenerated}
        />
      )}
    </div>
  )
}

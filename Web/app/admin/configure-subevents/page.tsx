"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/AdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Users, MapPin } from "lucide-react"

interface SubEvent {
  _id?: string
  id: string
  name: string
  description: string
  venue: string
  maxParticipants?: number
  isActive: boolean
  allowOutsiders: boolean
  allowedYears?: string[]
  allowedCourses?: string[]
  createdAt: string
  updatedAt: string
}

interface SubEventStats {
  subEventId: string
  subEventName: string
  totalParticipants: number
  confirmedParticipants: number
  maxParticipants?: number
  isActive: boolean
}

export default function ConfigureSubEventsPage() {
  const [subEvents, setSubEvents] = useState<SubEvent[]>([])
  const [stats, setStats] = useState<SubEventStats[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SubEvent | null>(null)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [availableCourses, setAvailableCourses] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    venue: "",
    maxParticipants: "",
    isActive: true,
    allowOutsiders: false,
    allowedYears: [] as string[],
    allowedCourses: [] as string[]
  })

  useEffect(() => {
    loadSubEvents()
    loadStats()
    loadYearsAndCourses()
  }, [])

  const loadYearsAndCourses = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/years-courses", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableYears(data.years || [])
        setAvailableCourses(data.courses || [])
      }
    } catch (error) {
      console.error("Error loading years and courses:", error)
    }
  }

  const loadSubEvents = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/subevents", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setSubEvents(data)
      }
    } catch (error) {
      console.error("Error loading subevents:", error)
      toast.error("Failed to load subevents")
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/subevents/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      venue: "",
      maxParticipants: "",
      isActive: true,
      allowOutsiders: false,
      allowedYears: "",
      allowedCourses: ""
    })
    setEditingEvent(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const maxParticipantsNum = formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined
      
      // Validate maxParticipants against current participant count (only for updates)
      if (editingEvent && maxParticipantsNum !== undefined) {
        const currentStats = getStatsForEvent(editingEvent.id)
        if (currentStats && currentStats.totalParticipants > maxParticipantsNum) {
          toast.error(`Cannot set max participants to ${maxParticipantsNum}. Current total registrations: ${currentStats.totalParticipants}. Max participants must be at least ${currentStats.totalParticipants}.`)
          setSaving(false)
          return
        }
      }

      const payload = {
        ...formData,
        maxParticipants: maxParticipantsNum,
        id: editingEvent ? editingEvent.id : `subevent_${Date.now()}`
      }

      const url = editingEvent ? "/api/admin/subevents" : "/api/admin/subevents"
      const method = editingEvent ? "PUT" : "POST"

      const token = localStorage.getItem("authToken")
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingEvent ? { ...payload, _id: editingEvent._id } : payload)
      })

      if (response.ok) {
        toast.success(editingEvent ? "Subevent updated successfully" : "Subevent created successfully")
        setDialogOpen(false)
        resetForm()
        loadSubEvents()
        loadStats()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to save subevent")
      }
    } catch (error) {
      console.error("Error saving subevent:", error)
      toast.error("Failed to save subevent")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (subEvent: SubEvent) => {
    setEditingEvent(subEvent)
    setFormData({
      name: subEvent.name,
      description: subEvent.description,
      venue: subEvent.venue,
      maxParticipants: subEvent.maxParticipants?.toString() || "",
      isActive: subEvent.isActive,
      allowOutsiders: subEvent.allowOutsiders ?? false,
      allowedYears: subEvent.allowedYears || [],
      allowedCourses: subEvent.allowedCourses || []
    })
    setDialogOpen(true)
  }

  const handleDelete = async (subEventId: string) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch("/api/admin/subevents", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: subEventId })
      })

      if (response.ok) {
        toast.success("Subevent deleted successfully")
        loadSubEvents()
        loadStats()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to delete subevent")
      }
    } catch (error) {
      console.error("Error deleting subevent:", error)
      toast.error("Failed to delete subevent")
    }
  }

  const getStatsForEvent = (eventId: string) => {
    return stats.find(stat => stat.subEventId === eventId)
  }

  if (loading) {
    return (
      <AdminLayout title="Configure Subevents">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading subevents...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Configure Subevents">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configure Subevents</h1>
            <p className="text-muted-foreground">
              Manage subevents that participants can register for
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Subevent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingEvent ? "Edit Subevent" : "Add New Subevent"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure the details for this subevent.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Technical Quiz"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the subevent"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input
                      id="venue"
                      value={formData.venue}
                      onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                      placeholder="e.g., Room 101, Block A"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="maxParticipants">Maximum Participants (Optional)</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                      placeholder="Leave empty for unlimited"
                      min="1"
                    />
                    {editingEvent && (() => {
                      const currentStats = getStatsForEvent(editingEvent.id)
                      return currentStats ? (
                        <p className="text-xs text-muted-foreground">
                          Current registrations: {currentStats.totalParticipants}. 
                          {currentStats.totalParticipants > 0 && " Max participants must be at least this number."}
                        </p>
                      ) : null
                    })()}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active (visible to participants)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allowOutsiders"
                      checked={formData.allowOutsiders}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowOutsiders: checked }))}
                    />
                    <Label htmlFor="allowOutsiders">Allow Non-KR Mangalam Students</Label>
                  </div>

                  <div className="grid gap-2">
                    <Label>Allowed Years (Optional)</Label>
                    <div className="flex flex-wrap gap-2 border border-neutral-200 dark:border-neutral-700 rounded-md p-3 min-h-[80px] max-h-[150px] overflow-y-auto">
                      {availableYears.length === 0 && <span className="text-sm text-muted-foreground">No years available in database</span>}
                      {availableYears.map((year) => (
                        <label key={year} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.allowedYears.includes(year)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, allowedYears: [...prev.allowedYears, year] }))
                              } else {
                                setFormData(prev => ({ ...prev, allowedYears: prev.allowedYears.filter(y => y !== year) }))
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{year}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select specific years. Leave empty for all years.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Allowed Courses (Optional)</Label>
                    <div className="flex flex-wrap gap-2 border border-neutral-200 dark:border-neutral-700 rounded-md p-3 min-h-[80px] max-h-[150px] overflow-y-auto">
                      {availableCourses.length === 0 && <span className="text-sm text-muted-foreground">No courses available in database</span>}
                      {availableCourses.map((course) => (
                        <label key={course} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.allowedCourses.includes(course)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, allowedCourses: [...prev.allowedCourses, course] }))
                              } else {
                                setFormData(prev => ({ ...prev, allowedCourses: prev.allowedCourses.filter(c => c !== course) }))
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{course}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select specific courses. Leave empty for all courses.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingEvent ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {subEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">No subevents configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first subevent to get started
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Subevent
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            subEvents.map((subEvent) => {
              const eventStats = getStatsForEvent(subEvent.id)
              return (
                <Card key={subEvent.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{subEvent.name}</CardTitle>
                        <Badge variant={subEvent.isActive ? "default" : "secondary"}>
                          {subEvent.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subEvent)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Subevent</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{subEvent.name}"? This action cannot be undone.
                                {eventStats && eventStats.totalParticipants > 0 && (
                                  <span className="block mt-2 text-red-600 font-semibold">
                                    Warning: {eventStats.totalParticipants} participants have selected this subevent.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(subEvent.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <CardDescription>{subEvent.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{subEvent.venue}</span>
                      </div>

                      {subEvent.maxParticipants && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Max: {subEvent.maxParticipants}
                          </span>
                        </div>
                      )}

                      {eventStats && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {eventStats.confirmedParticipants} confirmed
                          </span>
                        </div>
                      )}
                    </div>

                    {eventStats && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">
                          Total registrations: {eventStats.totalParticipants} |
                          Confirmed: {eventStats.confirmedParticipants}
                          {subEvent.maxParticipants && (
                            <> | Available: {Math.max(0, subEvent.maxParticipants - eventStats.totalParticipants)}</>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
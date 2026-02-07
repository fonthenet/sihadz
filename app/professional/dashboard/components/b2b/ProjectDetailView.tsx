'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Target,
  Loader2,
  Trash2,
  Edit,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProjectTimeline } from './ProjectTimeline'

interface ProjectDetailViewProps {
  projectId: string
  professional: { id: string; business_name?: string; type?: string }
  onBack: () => void
  onUpdate: () => void
}

const CATEGORIES = [
  { value: 'signature', label: 'Signature' },
  { value: 'payment', label: 'Payment' },
  { value: 'nda', label: 'Confidential agreement (NDA)' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'lawyer', label: 'Lawyer / Legal' },
  { value: 'authority_requirement', label: 'Authority requirement' },
  { value: 'other', label: 'Other' },
]

export function ProjectDetailView({ projectId, professional, onBack, onUpdate }: ProjectDetailViewProps) {
  const { toast } = useToast()
  const [project, setProject] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    meeting_date: new Date().toISOString().slice(0, 10),
    meeting_type: 'follow_up',
    notes: '',
    attendees: [] as string[],
    next_steps: [] as string[],
  })
  const [actionForm, setActionForm] = useState({
    title: '',
    action_type: 'small' as 'major' | 'small',
    category: 'other',
    responsible_external: '',
    deadline: '',
    objectives: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/b2b/projects/${projectId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProject(data.project)
      setMembers(data.members ?? [])
      setMeetings(data.meetings ?? [])
      setActions(data.actions ?? [])
      setDocuments(data.documents ?? [])
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to load project', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const handleAddMeeting = async () => {
    if (!meetingForm.title || !meetingForm.meeting_date) {
      toast({ title: 'Error', description: 'Title and date required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/b2b/projects/${projectId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(meetingForm),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setShowMeetingDialog(false)
      setMeetingForm({
        title: '',
        meeting_date: new Date().toISOString().slice(0, 10),
        meeting_type: 'follow_up',
        notes: '',
        attendees: [],
        next_steps: [],
      })
      fetchProject()
      onUpdate()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddAction = async () => {
    if (!actionForm.title) {
      toast({ title: 'Error', description: 'Title required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/b2b/projects/${projectId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(actionForm),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setShowActionDialog(false)
      setActionForm({
        title: '',
        action_type: 'small',
        category: 'other',
        responsible_external: '',
        deadline: '',
        objectives: '',
        notes: '',
      })
      fetchProject()
      onUpdate()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateActionStatus = async (actionId: string, status: string) => {
    try {
      const res = await fetch(`/api/b2b/projects/${projectId}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchProject()
      onUpdate()
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    }
  }

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      active: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
      pending: 'bg-amber-100 text-amber-700',
      in_progress: 'bg-blue-100 text-blue-700',
      overdue: 'bg-red-100 text-red-700',
    }
    return <Badge className={map[status] || 'bg-slate-100'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{project.title}</h2>
          <p className="text-muted-foreground">
            {statusBadge(project.status)}
            {project.project_deadline && (
              <span className="ms-2">
                Deadline: {new Date(project.project_deadline).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>{project.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{members.length} member(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{meetings.length} meeting(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>{actions.filter((a) => a.status !== 'completed').length} pending action(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Project participants</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-muted-foreground text-sm">No members yet</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      {m.professionals?.business_name ?? m.external_name ?? m.external_email ?? 'Unknown'}
                      {m.is_coordinator && (
                        <Badge variant="secondary" className="text-xs">Coordinator</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowMeetingDialog(true)}>
              <Plus className="h-4 w-4 me-2" />
              Add Meeting
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Meetings</CardTitle>
              <CardDescription>Meeting notes and resumes</CardDescription>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <p className="text-muted-foreground text-sm">No meetings yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.title}</TableCell>
                        <TableCell>{new Date(m.meeting_date).toLocaleDateString()}</TableCell>
                        <TableCell>{m.meeting_type}</TableCell>
                        <TableCell className="max-w-xs truncate">{m.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowActionDialog(true)}>
              <Plus className="h-4 w-4 me-2" />
              Add Action
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Tasks, deadlines, responsibles</CardDescription>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No actions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Responsible</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>
                          <Badge variant={a.action_type === 'major' ? 'default' : 'secondary'}>
                            {a.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}</TableCell>
                        <TableCell>
                          {(a.professionals as any)?.business_name ?? a.responsible_external ?? '—'}
                        </TableCell>
                        <TableCell>
                          {a.deadline ? new Date(a.deadline).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>{statusBadge(a.status)}</TableCell>
                        <TableCell>
                          {a.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateActionStatus(a.id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="timeline">
          <ProjectTimeline meetings={meetings} actions={actions} />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>NDA, contracts, agreements</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No documents yet</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((d) => (
                    <li key={d.id}>
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {d.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meeting</DialogTitle>
            <DialogDescription>Meeting notes and resume</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g. First call"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={meetingForm.meeting_date}
                  onChange={(e) => setMeetingForm((f) => ({ ...f, meeting_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={meetingForm.meeting_type}
                  onValueChange={(v) => setMeetingForm((f) => ({ ...f, meeting_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_call">First call</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="kickoff">Kickoff</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes (resume)</Label>
              <Textarea
                placeholder="Summary of discussion, decisions, next steps..."
                value={meetingForm.notes}
                onChange={(e) => setMeetingForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMeeting} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Action</DialogTitle>
            <DialogDescription>Task with deadline and responsible</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Sign NDA"
                value={actionForm.title}
                onChange={(e) => setActionForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={actionForm.action_type}
                  onValueChange={(v: 'major' | 'small') => setActionForm((f) => ({ ...f, action_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">Major (signatures, payments)</SelectItem>
                    <SelectItem value="small">Small (NDA, disclosures)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={actionForm.category}
                  onValueChange={(v) => setActionForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Responsible (external)</Label>
              <Input
                placeholder="Name or company"
                value={actionForm.responsible_external}
                onChange={(e) => setActionForm((f) => ({ ...f, responsible_external: e.target.value }))}
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={actionForm.deadline}
                onChange={(e) => setActionForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div>
              <Label>Objectives</Label>
              <Textarea
                placeholder="Objectives"
                value={actionForm.objectives}
                onChange={(e) => setActionForm((f) => ({ ...f, objectives: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAction} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Target, CheckCircle } from 'lucide-react'

interface Meeting {
  id: string
  title: string
  meeting_date: string
  meeting_type: string
  notes?: string | null
}

interface Action {
  id: string
  title: string
  action_type: string
  category: string
  deadline?: string | null
  status: string
}

interface ProjectTimelineProps {
  meetings: Meeting[]
  actions: Action[]
}

export function ProjectTimeline({ meetings, actions }: ProjectTimelineProps) {
  const timelineItems = useMemo(() => {
    const items: Array<{
      type: 'meeting' | 'action'
      date: string
      key: string
      title: string
      subtitle?: string
      status?: string
      icon: 'meeting' | 'action'
    }> = []

    meetings.forEach((m) => {
      items.push({
        type: 'meeting',
        date: m.meeting_date,
        key: `m-${m.id}`,
        title: m.title,
        subtitle: m.meeting_type,
        icon: 'meeting',
      })
    })

    actions.forEach((a) => {
      if (a.deadline) {
        items.push({
          type: 'action',
          date: a.deadline,
          key: `a-${a.id}`,
          title: a.title,
          subtitle: a.category,
          status: a.status,
          icon: 'action',
        })
      }
    })

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return items
  }, [meetings, actions])

  if (timelineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Meetings and action deadlines in chronological order</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No timeline items yet. Add meetings and actions with dates.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>Meetings and action deadlines in chronological order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute start-4 top-0 bottom-0 w-px bg-border" />
          <ul className="space-y-6">
            {timelineItems.map((item) => (
              <li key={item.key} className="relative flex gap-4 ps-10">
                <div
                  className={`absolute start-0 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${
                    item.icon === 'meeting' ? 'border-violet-500' : 'border-amber-500'
                  }`}
                >
                  {item.icon === 'meeting' ? (
                    <Calendar className="h-4 w-4 text-violet-600" />
                  ) : (
                    <Target className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{item.title}</p>
                    {item.status && (
                      <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {item.subtitle && ` · ${item.subtitle}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.type === 'meeting' ? 'Meeting' : 'Action'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

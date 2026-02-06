'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Brain,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  MessageSquare,
  Sparkles,
  Send,
  Flag,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface AIMessageTriageProps {
  messageId?: string
  messageContent: string
  senderType?: 'patient' | 'provider'
  onTriageComplete?: (result: TriageResult) => void
  onSendSuggestedReply?: (reply: string) => void
}

interface TriageResult {
  category: string
  priority: string
  suggestedReply: string
  requiresHumanReview: boolean
  escalationReason?: string
  suggestedActions: string[]
}

const categoryIcons: Record<string, React.ReactNode> = {
  appointment: <Clock className="h-3.5 w-3.5" />,
  medication: <span className="text-xs">💊</span>,
  lab_result: <span className="text-xs">🧪</span>,
  prescription: <span className="text-xs">📋</span>,
  urgent: <AlertTriangle className="h-3.5 w-3.5" />,
  billing: <span className="text-xs">💳</span>,
  admin: <span className="text-xs">📁</span>,
  general: <MessageSquare className="h-3.5 w-3.5" />,
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function AIMessageTriage({
  messageId,
  messageContent,
  senderType = 'patient',
  onTriageComplete,
  onSendSuggestedReply,
}: AIMessageTriageProps) {
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TriageResult | null>(null)
  const [editedReply, setEditedReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [aiProvider, setAiProvider] = useState('')
  
  const analyzeMessage = useCallback(async () => {
    if (!messageContent.trim()) return
    
    setLoading(true)
    setResult(null)
    
    try {
      const res = await fetch('/api/ai/triage-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent,
          messageId,
          senderType,
          language: 'fr', // Default to French for Algeria
        }),
      })
      
      const data = await res.json()
      
      if (res.ok && data.success && data.data) {
        setResult(data.data)
        setEditedReply(data.data.suggestedReply || '')
        setAiProvider(data.metadata?.provider || '')
        
        if (onTriageComplete) {
          onTriageComplete(data.data)
        }
      } else {
        toast({
          title: 'Analysis failed',
          description: data.error || 'Failed to analyze message',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect to AI service',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [messageContent, messageId, senderType, toast, onTriageComplete])
  
  const copyReply = useCallback(() => {
    navigator.clipboard.writeText(editedReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Copied to clipboard' })
  }, [editedReply, toast])
  
  const sendReply = useCallback(() => {
    if (onSendSuggestedReply) {
      onSendSuggestedReply(editedReply)
    }
  }, [editedReply, onSendSuggestedReply])

  return (
    <Card className="border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-600" />
            AI Triage
            {aiProvider && (
              <Badge variant="outline" className="text-xs font-normal">
                {aiProvider}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={analyzeMessage}
            disabled={loading || !messageContent.trim()}
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="ml-1">Analyze</span>
          </Button>
        </div>
      </CardHeader>
      
      {result && (
        <CardContent className="pt-0 space-y-3">
          {/* Category & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              {categoryIcons[result.category] || <MessageSquare className="h-3.5 w-3.5" />}
              {result.category}
            </Badge>
            <Badge className={`text-xs ${priorityColors[result.priority] || priorityColors.medium}`}>
              <Flag className="h-3 w-3 mr-1" />
              {result.priority}
            </Badge>
            {result.requiresHumanReview ? (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Review needed
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Auto-reply OK
              </Badge>
            )}
          </div>
          
          {/* Escalation Reason */}
          {result.escalationReason && (
            <div className="rounded bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{result.escalationReason}</span>
            </div>
          )}
          
          {/* Suggested Actions */}
          {result.suggestedActions && result.suggestedActions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Suggested actions:</p>
              <ul className="text-xs space-y-0.5">
                {result.suggestedActions.map((action, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Suggested Reply */}
          {result.suggestedReply && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Suggested reply:</p>
              <Textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                rows={4}
                className="text-xs resize-none"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyReply}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                {onSendSuggestedReply && (
                  <Button size="sm" onClick={sendReply}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Use Reply
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

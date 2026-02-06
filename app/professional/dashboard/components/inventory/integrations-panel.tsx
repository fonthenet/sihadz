'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  Key,
  Webhook,
  Download,
  Upload,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface ApiKey {
  id: string
  key_prefix: string
  name: string
  scopes: string[]
  rate_limit_per_minute: number
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  usage_count: number
  created_at: string
  key?: string // Only when just created
}

interface WebhookIntegration {
  id: string
  name: string
  config: {
    url: string
    secret?: string
    events?: string[]
  }
  is_active: boolean
  last_sync_at?: string
  last_sync_status?: string
  last_error?: string
  created_at: string
}

const WEBHOOK_EVENTS = [
  { id: 'product.created', label: 'Product Created' },
  { id: 'product.updated', label: 'Product Updated' },
  { id: 'product.deleted', label: 'Product Deleted' },
  { id: 'stock.received', label: 'Stock Received' },
  { id: 'stock.adjusted', label: 'Stock Adjusted' },
  { id: 'stock.low', label: 'Low Stock Alert' },
  { id: 'stock.out', label: 'Out of Stock' },
  { id: 'stock.expiring', label: 'Stock Expiring' },
  { id: 'stock.expired', label: 'Stock Expired' },
]

const API_SCOPES = [
  { id: 'products:read', label: 'Read Products' },
  { id: 'products:write', label: 'Write Products' },
  { id: 'stock:read', label: 'Read Stock' },
  { id: 'stock:write', label: 'Write Stock' },
  { id: 'transactions:read', label: 'Read Transactions' },
  { id: 'suppliers:read', label: 'Read Suppliers' },
  { id: 'suppliers:write', label: 'Write Suppliers' },
  { id: 'all', label: 'Full Access' },
]

export default function IntegrationsPanel() {
  const { toast } = useToast()
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['products:read', 'stock:read'])
  const [newKeyExpiry, setNewKeyExpiry] = useState<string>('never')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  
  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookIntegration[]>([])
  const [loadingWebhooks, setLoadingWebhooks] = useState(true)
  const [showCreateWebhook, setShowCreateWebhook] = useState(false)
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[]
  })
  const [creatingWebhook, setCreatingWebhook] = useState(false)

  // Load API keys
  const loadApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/integrations/api-keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys || [])
      }
    } catch (err) {
      console.error('Error loading API keys:', err)
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  // Load webhooks
  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/integrations/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch (err) {
      console.error('Error loading webhooks:', err)
    } finally {
      setLoadingWebhooks(false)
    }
  }, [])

  useEffect(() => {
    loadApiKeys()
    loadWebhooks()
  }, [loadApiKeys, loadWebhooks])

  // Create API key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({ title: 'Error', description: 'Key name is required', variant: 'destructive' })
      return
    }

    setCreatingKey(true)
    try {
      const res = await fetch('/api/pharmacy/inventory/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          scopes: newKeyScopes,
          expires_in_days: newKeyExpiry === 'never' ? null : parseInt(newKeyExpiry)
        })
      })

      const data = await res.json()
      if (res.ok) {
        setNewlyCreatedKey(data.api_key.key)
        toast({ title: 'Success', description: 'API key created! Copy it now - it won\'t be shown again.' })
        loadApiKeys()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setCreatingKey(false)
    }
  }

  // Revoke API key
  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/pharmacy/inventory/integrations/api-keys?id=${keyId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'API key revoked' })
        loadApiKeys()
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  // Create webhook
  const handleCreateWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast({ title: 'Error', description: 'Name and URL are required', variant: 'destructive' })
      return
    }

    setCreatingWebhook(true)
    try {
      const res = await fetch('/api/pharmacy/inventory/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookForm)
      })

      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Webhook created' })
        setShowCreateWebhook(false)
        setWebhookForm({ name: '', url: '', secret: '', events: [] })
        loadWebhooks()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setCreatingWebhook(false)
    }
  }

  // Toggle webhook active
  const toggleWebhook = async (webhook: WebhookIntegration) => {
    try {
      const res = await fetch('/api/pharmacy/inventory/integrations/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: webhook.id, is_active: !webhook.is_active })
      })
      if (res.ok) {
        loadWebhooks()
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  // Delete webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Delete this webhook?')) return

    try {
      const res = await fetch(`/api/pharmacy/inventory/integrations/webhooks?id=${webhookId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast({ title: 'Success', description: 'Webhook deleted' })
        loadWebhooks()
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  // Test webhook
  const handleTestWebhook = async () => {
    try {
      const res = await fetch('/api/pharmacy/inventory/webhooks/test', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Test Sent', description: data.message })
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  // Export
  const handleExport = async (format: 'json' | 'csv') => {
    const url = `/api/pharmacy/inventory/export?format=${format}&type=all`
    window.open(url, '_blank')
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied!', description: 'Copied to clipboard' })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Create API keys for external software to access your inventory
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateKey(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No API keys yet. Create one to enable external integrations.
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.name}</span>
                          <Badge variant={key.is_active ? 'default' : 'secondary'}>
                            {key.is_active ? 'Active' : 'Revoked'}
                          </Badge>
                        </div>
                        <code className="text-xs text-muted-foreground">{key.key_prefix}...</code>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Used {key.usage_count} times</span>
                          {key.last_used_at && (
                            <span>Last: {new Date(key.last_used_at).toLocaleDateString()}</span>
                          )}
                          {key.expires_at && (
                            <span>Expires: {new Date(key.expires_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {key.scopes.map(scope => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={!key.is_active}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Receive real-time notifications when inventory events occur
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestWebhook}>
                  Test Webhooks
                </Button>
                <Button onClick={() => setShowCreateWebhook(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingWebhooks ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No webhooks configured. Add one to receive real-time updates.
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map(webhook => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{webhook.name}</span>
                          {webhook.last_sync_status === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {webhook.last_sync_status === 'failed' && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground block truncate max-w-md">
                          {webhook.config.url}
                        </code>
                        <div className="flex gap-1 flex-wrap">
                          {(webhook.config.events?.length ? webhook.config.events : ['All events']).map(event => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                        {webhook.last_error && (
                          <p className="text-xs text-destructive">{webhook.last_error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={webhook.is_active}
                          onCheckedChange={() => toggleWebhook(webhook)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Inventory</CardTitle>
              <CardDescription>
                Download your product catalog and stock levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => handleExport('csv')} variant="outline" className="h-24 flex-col gap-2">
                  <FileSpreadsheet className="h-8 w-8" />
                  <span>Export as CSV</span>
                  <span className="text-xs text-muted-foreground">Compatible with Excel, Google Sheets</span>
                </Button>
                <Button onClick={() => handleExport('json')} variant="outline" className="h-24 flex-col gap-2">
                  <Download className="h-8 w-8" />
                  <span>Export as JSON</span>
                  <span className="text-xs text-muted-foreground">For developers & API use</span>
                </Button>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">API Export Endpoint</h4>
                <code className="text-sm block p-2 bg-background rounded border">
                  GET /api/pharmacy/inventory/export?format=csv&api_key=YOUR_KEY
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Use your API key to programmatically export data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Products</CardTitle>
              <CardDescription>
                Bulk import products from CSV or JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">CSV Format</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a CSV file with these columns (name and selling_price required):
                </p>
                <code className="text-xs block p-2 bg-muted rounded overflow-x-auto">
                  barcode,name,generic_name,form,dosage,manufacturer,purchase_price,selling_price,
                  is_chifa_listed,reimbursement_rate,requires_prescription,min_stock_level,initial_stock
                </code>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">API Import Endpoint</h4>
                <code className="text-sm block p-2 bg-muted rounded">
                  POST /api/pharmacy/inventory/import
                </code>
                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
{`{
  "products": [
    {
      "name": "Doliprane 500mg",
      "barcode": "3400930000000",
      "selling_price": 150,
      "purchase_price": 100,
      "is_chifa_listed": true,
      "reimbursement_rate": 80,
      "initial_stock": 50
    }
  ]
}`}
                </pre>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex gap-2">
                  <ExternalLink className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Google Sheets Integration</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Set up automatic sync with Google Sheets using our Apps Script template.
                      Create a webhook and use the export API to keep your spreadsheet updated.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateKey} onOpenChange={(open) => {
        setShowCreateKey(open)
        if (!open) {
          setNewKeyName('')
          setNewKeyScopes(['products:read', 'stock:read'])
          setNewKeyExpiry('never')
          setNewlyCreatedKey(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              {newlyCreatedKey 
                ? 'Copy your new API key. It will only be shown once!'
                : 'Generate a new API key for external integrations'
              }
            </DialogDescription>
          </DialogHeader>

          {newlyCreatedKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900 dark:text-green-100">Key Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white dark:bg-black rounded text-sm break-all">
                    {showKey ? newlyCreatedKey : '••••••••••••••••••••••••••••••'}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(newlyCreatedKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Store this key securely. It cannot be retrieved later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  placeholder="e.g., Google Sheets Sync"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {API_SCOPES.map(scope => (
                    <label key={scope.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={newKeyScopes.includes(scope.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewKeyScopes([...newKeyScopes, scope.id])
                          } else {
                            setNewKeyScopes(newKeyScopes.filter(s => s !== scope.id))
                          }
                        }}
                      />
                      {scope.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {newlyCreatedKey ? (
              <Button onClick={() => setShowCreateKey(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCreateKey(false)}>Cancel</Button>
                <Button onClick={handleCreateKey} disabled={creatingKey}>
                  {creatingKey ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook to receive real-time inventory updates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Main POS System"
                value={webhookForm.name}
                onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                placeholder="https://your-server.com/webhook"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Secret (optional)</Label>
              <Input
                placeholder="Signing secret for verification"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Used to sign webhook payloads (X-Webhook-Signature header)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Events</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Leave empty to receive all events
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={webhookForm.events.includes(event.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setWebhookForm({ ...webhookForm, events: [...webhookForm.events, event.id] })
                        } else {
                          setWebhookForm({ ...webhookForm, events: webhookForm.events.filter(e => e !== event.id) })
                        }
                      }}
                    />
                    {event.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>Cancel</Button>
            <Button onClick={handleCreateWebhook} disabled={creatingWebhook}>
              {creatingWebhook ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

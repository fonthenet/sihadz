'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Store,
  Truck,
  CreditCard,
  Clock,
  Save,
  Info,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import type { StorefrontSettings, StorefrontSettingsFormData } from '@/lib/storefront/types'

export default function StorefrontSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<StorefrontSettingsFormData>({
    is_enabled: false,
    storefront_name: '',
    storefront_name_ar: '',
    storefront_description: '',
    storefront_description_ar: '',
    pickup_enabled: true,
    delivery_enabled: false,
    delivery_fee: 0,
    delivery_radius_km: undefined,
    delivery_notes: '',
    accept_cash_on_pickup: true,
    accept_online_payment: false,
    min_order_amount: 0,
    preparation_time_minutes: 30,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/storefront/settings')
      const data = await res.json()
      if (data.settings) {
        setSettings({
          is_enabled: data.settings.is_enabled || false,
          storefront_name: data.settings.storefront_name || '',
          storefront_name_ar: data.settings.storefront_name_ar || '',
          storefront_description: data.settings.storefront_description || '',
          storefront_description_ar: data.settings.storefront_description_ar || '',
          pickup_enabled: data.settings.pickup_enabled !== false,
          delivery_enabled: data.settings.delivery_enabled || false,
          delivery_fee: data.settings.delivery_fee || 0,
          delivery_radius_km: data.settings.delivery_radius_km || undefined,
          delivery_notes: data.settings.delivery_notes || '',
          accept_cash_on_pickup: data.settings.accept_cash_on_pickup !== false,
          accept_online_payment: data.settings.accept_online_payment || false,
          min_order_amount: data.settings.min_order_amount || 0,
          preparation_time_minutes: data.settings.preparation_time_minutes || 30,
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/storefront/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Settings saved', description: 'Your storefront settings have been updated' })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/professional/dashboard/storefront">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Store Settings</h1>
          <p className="text-muted-foreground">Configure your online storefront</p>
        </div>
      </div>

      {/* Store Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Store Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Online Store</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, customers can browse and order from your store
              </p>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storefront_name">Store Name</Label>
            <Input
              id="storefront_name"
              placeholder="My Online Pharmacy"
              value={settings.storefront_name}
              onChange={(e) => setSettings({ ...settings, storefront_name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use your business name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storefront_description">Store Description</Label>
            <Textarea
              id="storefront_description"
              placeholder="Welcome to our online store..."
              value={settings.storefront_description}
              onChange={(e) => setSettings({ ...settings, storefront_description: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fulfillment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Fulfillment Options
          </CardTitle>
          <CardDescription>How customers receive their orders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>In-Store Pickup</Label>
              <p className="text-sm text-muted-foreground">
                Customers pick up orders at your location
              </p>
            </div>
            <Switch
              checked={settings.pickup_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, pickup_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Home Delivery</Label>
              <p className="text-sm text-muted-foreground">
                Offer delivery to customers (optional)
              </p>
            </div>
            <Switch
              checked={settings.delivery_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, delivery_enabled: checked })}
            />
          </div>

          {settings.delivery_enabled && (
            <div className="grid gap-4 sm:grid-cols-2 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="delivery_fee">Delivery Fee (DZD)</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  min={0}
                  value={settings.delivery_fee}
                  onChange={(e) => setSettings({ ...settings, delivery_fee: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_radius">Delivery Radius (km)</Label>
                <Input
                  id="delivery_radius"
                  type="number"
                  min={1}
                  placeholder="e.g. 10"
                  value={settings.delivery_radius_km || ''}
                  onChange={(e) => setSettings({ ...settings, delivery_radius_km: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="delivery_notes">Delivery Notes</Label>
                <Textarea
                  id="delivery_notes"
                  placeholder="Delivery terms, areas covered, etc."
                  value={settings.delivery_notes}
                  onChange={(e) => setSettings({ ...settings, delivery_notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </CardTitle>
          <CardDescription>How customers pay for orders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Cash on Pickup</Label>
              <p className="text-sm text-muted-foreground">
                Customer pays when collecting the order
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Primary</Badge>
              <Switch
                checked={settings.accept_cash_on_pickup}
                onCheckedChange={(checked) => setSettings({ ...settings, accept_cash_on_pickup: checked })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Online Payment</Label>
              <p className="text-sm text-muted-foreground">
                Wallet or card payment (BaridiMob, CIB, etc.)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Optional</Badge>
              <Switch
                checked={settings.accept_online_payment}
                onCheckedChange={(checked) => setSettings({ ...settings, accept_online_payment: checked })}
              />
            </div>
          </div>

          {settings.accept_online_payment && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-sm">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-blue-700 dark:text-blue-300">
                Online payments use your existing wallet and Chargily integration. 
                Customers can pay with BaridiMob, CIB, or their SihaDZ wallet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Order Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min_order">Minimum Order (DZD)</Label>
              <Input
                id="min_order"
                type="number"
                min={0}
                value={settings.min_order_amount}
                onChange={(e) => setSettings({ ...settings, min_order_amount: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">0 = no minimum</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep_time">Preparation Time (minutes)</Label>
              <Input
                id="prep_time"
                type="number"
                min={5}
                value={settings.preparation_time_minutes}
                onChange={(e) => setSettings({ ...settings, preparation_time_minutes: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground">Estimated time to prepare orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/professional/dashboard/storefront">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <LoadingSpinner size="sm" className="me-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}

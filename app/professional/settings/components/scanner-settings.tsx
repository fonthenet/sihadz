'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, ScanLine, Package, FileText, Receipt, Layers, CreditCard } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DEFAULT_SCANNER_SETTINGS,
  type ScannerSettings,
  type ScannerSuffixKey,
  type ScanContext,
} from '@/lib/scanner/types'

interface ScannerSettingsProps {
  professional: { id: string; type: string }
  onUpdate?: () => void
}

const CONTEXT_LABELS: Record<ScanContext, { label: string; icon: React.ReactNode; desc: string }> = {
  products: {
    label: 'Products (POS)',
    icon: <Package className="h-4 w-4" />,
    desc: 'Scan products at checkout, add to cart',
  },
  prescriptions: {
    label: 'Prescriptions',
    icon: <FileText className="h-4 w-4" />,
    desc: 'Scan prescription numbers, patient IDs',
  },
  receipts: {
    label: 'Receipts',
    icon: <Receipt className="h-4 w-4" />,
    desc: 'Look up receipts by barcode/receipt number',
  },
  inventory: {
    label: 'Inventory',
    icon: <Layers className="h-4 w-4" />,
    desc: 'Product catalog, stock levels, barcode search',
  },
  chifa: {
    label: 'Chifa / CNAS Card',
    icon: <CreditCard className="h-4 w-4" />,
    desc: 'Read Chifa card in POS payment (keyboard-wedge reader)',
  },
}

export default function ScannerSettings({ professional, onUpdate }: ScannerSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<ScannerSettings>(DEFAULT_SCANNER_SETTINGS)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/professional/scanner-settings', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const s = data.scanner_settings
        if (s) {
          setSettings({
            enabled: s.enabled ?? true,
            suffixKey: s.suffixKey ?? 'Enter',
            minBarcodeLength: s.minBarcodeLength ?? 8,
            scanContexts: {
              products: s.scanContexts?.products ?? true,
              prescriptions: s.scanContexts?.prescriptions ?? true,
              receipts: s.scanContexts?.receipts ?? true,
              inventory: s.scanContexts?.inventory ?? true,
              chifa: s.scanContexts?.chifa ?? true,
            },
            soundOnScan: s.soundOnScan ?? false,
          })
        }
      }
    } catch (err) {
      console.error('Load scanner settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/professional/scanner-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanner_settings: settings }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Scanner settings saved', description: 'Hand scanner will use these settings.' })
        onUpdate?.()
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateContext = (ctx: ScanContext, value: boolean) => {
    setSettings(s => ({
      ...s,
      scanContexts: { ...s.scanContexts, [ctx]: value },
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Loading scanner settings...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5" />
          Hand Scanner
        </CardTitle>
        <CardDescription>
          Configure your barcode scanner for products, prescriptions, and receipts. Works with USB and Bluetooth hand scanners that emulate a keyboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master switch */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base font-medium">Enable scanner</Label>
            <p className="text-sm text-muted-foreground">
              Allow barcode scanning across the platform
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={v => setSettings(s => ({ ...s, enabled: v }))}
          />
        </div>

        {/* Suffix key */}
        <div className="space-y-2">
          <Label>Suffix key (what scanner sends after barcode)</Label>
          <Select
            value={settings.suffixKey}
            onValueChange={(v: ScannerSuffixKey) => setSettings(s => ({ ...s, suffixKey: v }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Enter">Enter (default)</SelectItem>
              <SelectItem value="Tab">Tab</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Most scanners send Enter. Change if your scanner uses Tab.
          </p>
        </div>

        {/* Min barcode length */}
        <div className="space-y-2">
          <Label>Minimum barcode length</Label>
          <Select
            value={String(settings.minBarcodeLength)}
            onValueChange={v => setSettings(s => ({ ...s, minBarcodeLength: parseInt(v, 10) }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 characters</SelectItem>
              <SelectItem value="5">5 characters</SelectItem>
              <SelectItem value="8">8 characters (EAN-8)</SelectItem>
              <SelectItem value="13">13 characters (EAN-13)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Shorter inputs are treated as manual typing, not scans.
          </p>
        </div>

        {/* Scan contexts */}
        <div className="space-y-3">
          <Label>Where scanner works</Label>
          <p className="text-sm text-muted-foreground">
            Enable scanning in the areas relevant to your business.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(CONTEXT_LABELS) as ScanContext[]).map(ctx => (
              <div
                key={ctx}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2">{CONTEXT_LABELS[ctx].icon}</div>
                  <div>
                    <p className="font-medium">{CONTEXT_LABELS[ctx].label}</p>
                    <p className="text-xs text-muted-foreground">{CONTEXT_LABELS[ctx].desc}</p>
                  </div>
                </div>
                <Switch
                  checked={settings.scanContexts[ctx]}
                  onCheckedChange={v => updateContext(ctx, v)}
                  disabled={!settings.enabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sound on scan */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base font-medium">Sound on successful scan</Label>
            <p className="text-sm text-muted-foreground">Play a beep when a scan is recognized</p>
          </div>
          <Switch
            checked={settings.soundOnScan}
            onCheckedChange={v => setSettings(s => ({ ...s, soundOnScan: v }))}
            disabled={!settings.enabled}
          />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
      </CardContent>
    </Card>
  )
}

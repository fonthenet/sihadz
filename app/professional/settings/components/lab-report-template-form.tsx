'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Save, FileText, Eye, Beaker, Building2, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { LabReportTemplate } from '@/lib/print-prescription-lab'

export interface LabReportTemplateFormProps {
  professional: { id: string; business_name?: string; address?: string; phone?: string; email?: string; lab_report_template?: unknown }
  onUpdate?: () => void
  /** Show Save button (default true). Set false when used inside a parent form that saves. */
  showSaveButton?: boolean
}

export function LabReportTemplateForm({ professional, onUpdate, showSaveButton = true }: LabReportTemplateFormProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [labName, setLabName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [slogan, setSlogan] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [showQrCode, setShowQrCode] = useState(true)
  const [showInterpretation, setShowInterpretation] = useState(true)
  const [showLabNotes, setShowLabNotes] = useState(true)
  const [signatureTechnician, setSignatureTechnician] = useState('')
  const [signaturePathologist, setSignaturePathologist] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1e40af')
  const [fontFamily, setFontFamily] = useState<'default' | 'serif' | 'modern'>('default')
  const [reportLayout, setReportLayout] = useState<'hemolab' | 'hospital' | 'professional'>('professional')
  const [templateOpen, setTemplateOpen] = useState(true)

  const labTemplate = (professional?.lab_report_template as LabReportTemplate) || {}
  useEffect(() => {
    setLabName(labTemplate.labName ?? professional?.business_name ?? '')
    setLogoUrl(labTemplate.logoUrl ?? '')
    setSlogan(labTemplate.slogan ?? '')
    setAddress(labTemplate.address ?? professional?.address ?? '')
    setPhone(labTemplate.phone ?? professional?.phone ?? '')
    setEmail(labTemplate.email ?? professional?.email ?? '')
    setWebsite(labTemplate.website ?? '')
    setShowQrCode(labTemplate.showQrCode !== false)
    setShowInterpretation(labTemplate.showInterpretation !== false)
    setShowLabNotes(labTemplate.showLabNotes !== false)
    setSignatureTechnician(labTemplate.signatureTechnician ?? '')
    setSignaturePathologist(labTemplate.signaturePathologist ?? '')
    setPrimaryColor(labTemplate.primaryColor ?? '#1e40af')
    setFontFamily((labTemplate.fontFamily as 'default' | 'serif' | 'modern') ?? 'default')
    setReportLayout((labTemplate.reportLayout as 'hemolab' | 'hospital' | 'professional') ?? 'professional')
  }, [professional?.lab_report_template, professional?.business_name, professional?.address, professional?.phone, professional?.email])

  const handleSaveTemplate = async () => {
    if (!professional?.id) return
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const payload: LabReportTemplate = {
        labName: labName.trim() || professional?.business_name,
        logoUrl: logoUrl.trim(),
        slogan: slogan.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        showQrCode,
        showInterpretation,
        showLabNotes,
        signatureTechnician: signatureTechnician.trim(),
        signaturePathologist: signaturePathologist.trim(),
        primaryColor: primaryColor.trim() || '#1e40af',
        fontFamily,
        reportLayout,
      }
      const { error } = await supabase
        .from('professionals')
        .update({
          lab_report_template: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', professional.id)
      if (error) throw error
      toast({ title: 'Template saved', description: 'Lab report template has been updated.' })
      onUpdate?.()
    } catch (e) {
      console.error('Save template error:', e)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save template.' })
    } finally {
      setSaving(false)
    }
  }

  const layoutOptions = [
    { 
      value: 'professional', 
      label: 'Standard Report', 
      desc: 'Clean professional layout with all sections',
      icon: ClipboardList
    },
    { 
      value: 'hemolab', 
      label: 'Categorized Report', 
      desc: 'Tests grouped by category with status badges',
      icon: Beaker
    },
    { 
      value: 'hospital', 
      label: 'Compact Report', 
      desc: 'Simple centered layout, minimal design',
      icon: Building2
    },
  ] as const

  const handlePreview = () => {
    const tpl = {
      labName: labName.trim() || professional?.business_name || 'Medical Laboratory',
      slogan: slogan.trim() || 'Quality · Accuracy · Care',
      address: address.trim() || 'Medical District, City',
      phone: phone.trim() || '+213 555 123 456',
      email: email.trim() || 'contact@lab.dz',
      website: website.trim() || 'www.lab.dz',
      signatureTechnician: signatureTechnician.trim() || 'Lab Technician',
      signaturePathologist: signaturePathologist.trim() || 'Dr. Pathologist',
      logoUrl: logoUrl.trim(),
    }

    const accent = primaryColor.trim() || '#1e40af'
    const fontStack = fontFamily === 'serif' ? "Georgia, 'Times New Roman', serif" : fontFamily === 'modern' ? "'Segoe UI', 'Helvetica Neue', sans-serif" : "'Segoe UI', Arial, sans-serif"
    
    // Sample test data
    const sampleTests = [
      { name: 'Hemoglobin (Hb)', result: '12.5', unit: 'g/dL', ref: '13.0 - 17.0', status: 'low', category: 'Hematology' },
      { name: 'White Blood Cells', result: '7.2', unit: '×10³/µL', ref: '4.0 - 11.0', status: 'normal', category: 'Hematology' },
      { name: 'Platelets', result: '245', unit: '×10³/µL', ref: '150 - 400', status: 'normal', category: 'Hematology' },
      { name: 'Fasting Glucose', result: '95', unit: 'mg/dL', ref: '70 - 100', status: 'normal', category: 'Biochemistry' },
      { name: 'Creatinine', result: '1.1', unit: 'mg/dL', ref: '0.7 - 1.3', status: 'normal', category: 'Biochemistry' },
    ]

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('LAB-REPORT-SAMPLE')}`
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    // Build header based on layout
    const buildHeader = () => {
      return `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${accent}; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${tpl.logoUrl ? `<img src="${tpl.logoUrl}" alt="Logo" style="max-height: 52px;" onerror="this.style.display='none'">` : `<div style="width: 52px; height: 52px; background: ${accent}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">🔬</div>`}
            <div>
              <h1 style="font-size: 22px; font-weight: bold; color: ${accent}; margin: 0;">${tpl.labName}</h1>
              <p style="font-size: 12px; color: #6b7280; margin: 2px 0 0 0;">${tpl.slogan}</p>
              <p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">${tpl.address}</p>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #6b7280;">
            <div>📞 ${tpl.phone}</div>
            <div>✉ ${tpl.email}</div>
            <div>🌐 ${tpl.website}</div>
          </div>
        </div>`
    }

    // Build patient info section
    const buildPatientInfo = () => {
      return `
        <div style="position: relative; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          ${showQrCode ? `<div style="position: absolute; top: 8px; right: 8px;"><img src="${qrUrl}" alt="QR" width="80" height="80" style="display: block;"></div>` : ''}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; ${showQrCode ? 'max-width: calc(100% - 100px);' : ''}">
            <div><strong>Patient:</strong> Ahmed Benali</div>
            <div><strong>ID:</strong> PAT-2024-001</div>
            <div><strong>Age/Sex:</strong> 35 years / Male</div>
            <div><strong>Ref. By:</strong> Dr. Karim Mansouri</div>
            <div><strong>Collected:</strong> ${today}</div>
            <div><strong>Reported:</strong> ${today}</div>
          </div>
        </div>`
    }

    // Build results table
    const buildResultsTable = () => {
      if (reportLayout === 'hemolab') {
        // Grouped by category
        const categories = [...new Set(sampleTests.map(t => t.category))]
        return categories.map(cat => `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 700; color: ${accent}; margin-bottom: 10px; border-bottom: 2px solid ${accent}; padding-bottom: 6px;">${cat}</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead><tr style="background: #f3f4f6;">
                <th style="padding: 10px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Test</th>
                <th style="padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600;">Result</th>
                <th style="padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600;">Reference</th>
                <th style="padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600;">Status</th>
              </tr></thead>
              <tbody>
                ${sampleTests.filter(t => t.category === cat).map(t => `
                  <tr>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${t.name}</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${t.result} ${t.unit}</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${t.ref}</td>
                    <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; ${t.status === 'normal' ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">${t.status.toUpperCase()}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')
      }

      // Standard table for professional and hospital layouts
      return `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
          <thead><tr style="background: ${accent}; color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid ${accent};">Investigation</th>
            <th style="padding: 12px; text-align: center; border: 1px solid ${accent};">Result</th>
            <th style="padding: 12px; text-align: center; border: 1px solid ${accent};">Unit</th>
            <th style="padding: 12px; text-align: center; border: 1px solid ${accent};">Reference Range</th>
          </tr></thead>
          <tbody>
            ${sampleTests.map((t, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${t.name}</td>
                <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600; ${t.status !== 'normal' ? `color: #dc2626;` : ''}">${t.result}</td>
                <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${t.unit}</td>
                <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${t.ref}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
    }

    // Build interpretation and notes
    const buildExtras = () => {
      let extras = ''
      if (showInterpretation) {
        extras += `
          <div style="margin-bottom: 16px; padding: 12px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px;">
            <div style="font-weight: 700; color: #92400e; margin-bottom: 4px;">Clinical Interpretation:</div>
            <div style="font-size: 13px; color: #78350f;">Mild anemia detected. Hemoglobin slightly below normal range. Recommend dietary iron supplementation and follow-up in 4 weeks.</div>
          </div>`
      }
      if (showLabNotes) {
        extras += `
          <div style="margin-bottom: 16px; padding: 12px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px;">
            <div style="font-weight: 700; color: #0369a1; margin-bottom: 4px;">Lab Notes:</div>
            <div style="font-size: 13px; color: #075985;">Sample collected under fasting conditions. Patient advised to maintain adequate hydration before next test.</div>
          </div>`
      }
      return extras
    }

    // Build signatures
    const buildSignatures = () => {
      return `
        <div style="display: flex; justify-content: space-between; margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1d5db;">
          <div style="text-align: center; min-width: 200px;">
            <div style="font-family: 'Brush Script MT', cursive; font-size: 22px; color: #374151; margin-bottom: 4px;">${tpl.signatureTechnician}</div>
            <div style="border-top: 1px solid #9ca3af; padding-top: 4px;">
              <div style="font-size: 12px; font-weight: 600;">Medical Lab Technician</div>
              <div style="font-size: 11px; color: #6b7280;">(DMLT, BMLT)</div>
            </div>
          </div>
          <div style="text-align: center; min-width: 200px;">
            <div style="font-family: 'Brush Script MT', cursive; font-size: 22px; color: #374151; margin-bottom: 4px;">${tpl.signaturePathologist}</div>
            <div style="border-top: 1px solid #9ca3af; padding-top: 4px;">
              <div style="font-size: 12px; font-weight: 600;">Pathologist</div>
              <div style="font-size: 11px; color: #6b7280;">(MD, Pathologist)</div>
            </div>
          </div>
        </div>`
    }

    // Build footer
    const buildFooter = () => {
      return `
        <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;">
          <span>Generated on: ${new Date().toLocaleString()}</span>
          <span>Page 1 of 1</span>
        </div>`
    }

    // Assemble the full document
    const body = `
      ${buildHeader()}
      <h2 style="text-align: center; font-size: 18px; color: ${accent}; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px;">Laboratory Test Results</h2>
      ${buildPatientInfo()}
      ${buildResultsTable()}
      ${buildExtras()}
      ${buildSignatures()}
      ${buildFooter()}
    `

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lab Report Preview - ${tpl.labName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${fontStack}; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; background: white; line-height: 1.5; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
${body}
</body>
</html>`

    // Open preview window
    const previewWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes')
    if (!previewWindow) {
      toast({ variant: 'destructive', title: 'Popup Blocked', description: 'Please allow popups to see the preview.' })
      return
    }
    previewWindow.document.open()
    previewWindow.document.write(html)
    previewWindow.document.close()
  }

  return (
    <Collapsible open={templateOpen} onOpenChange={setTemplateOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {templateOpen ? (
                    <ChevronDown className="h-5 w-5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0" />
                  )}
                  <FileText className="h-5 w-5" />
                  Lab Report Template
                </CardTitle>
                <CardDescription>
                  Customize how printed lab results appear. Choose a layout style and configure your lab branding.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
      <CardContent className="space-y-6">
        {/* Template Style Selection */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Report Layout</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {layoutOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReportLayout(opt.value)}
                  className={`relative rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50 ${
                    reportLayout === opt.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-muted bg-muted/30'
                  }`}
                >
                  {reportLayout === opt.value && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        <hr className="border-muted" />

        {/* Branding Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="labName">Lab Name</Label>
            <Input id="labName" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Your Laboratory Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slogan">Tagline / Slogan</Label>
            <Input id="slogan" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Quality · Accuracy · Care" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Medical Street, City" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+213 555 123 456" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@yourlab.dz" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.yourlab.dz" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <hr className="border-muted" />

        {/* Signatures */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signatureTechnician">Technician Name</Label>
            <Input id="signatureTechnician" value={signatureTechnician} onChange={(e) => setSignatureTechnician(e.target.value)} placeholder="Lab Technician Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signaturePathologist">Pathologist Name</Label>
            <Input id="signaturePathologist" value={signaturePathologist} onChange={(e) => setSignaturePathologist(e.target.value)} placeholder="Dr. Pathologist Name" />
          </div>
        </div>

        <hr className="border-muted" />

        {/* Options */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Report Options</Label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="showQr" className="text-sm">Show QR Code</Label>
              <Switch id="showQr" checked={showQrCode} onCheckedChange={setShowQrCode} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="showInterp" className="text-sm">Interpretation</Label>
              <Switch id="showInterp" checked={showInterpretation} onCheckedChange={setShowInterpretation} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="showNotes" className="text-sm">Lab Notes</Label>
              <Switch id="showNotes" checked={showLabNotes} onCheckedChange={setShowLabNotes} />
            </div>
          </div>
        </div>

        <hr className="border-muted" />

        {/* Styling */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1e40af"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fontFamily">Font Style</Label>
            <select
              id="fontFamily"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value as 'default' | 'serif' | 'modern')}
              className="w-full h-10 px-3 border rounded-md bg-background"
            >
              <option value="default">Default (Sans-serif)</option>
              <option value="serif">Classic (Serif)</option>
              <option value="modern">Modern (Clean)</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          {showSaveButton && (
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
        </CollapsibleContent>
    </Card>
    </Collapsible>
  )
}

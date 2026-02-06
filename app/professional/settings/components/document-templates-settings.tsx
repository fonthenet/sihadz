'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, FileText, Image, Building2, Eye, PenLine, Palette, Check, ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFitToScreenScale } from '@/hooks/use-fit-to-screen-scale'
import { getPrescriptionPrintHtml, getLabRequestPrintHtml } from '@/lib/print-prescription-lab'

export interface DocumentTemplate {
  practiceName?: string
  headerText?: string
  logoUrl?: string
  footerText?: string
  tagline?: string
  signatureStyle?: string
  signatureText?: string
  signatureImageUrl?: string
  primaryColor?: string
  fontFamily?: string
  /** Form layout: 'table' | 'card' | 'receipt' | 'certificate' | 'chart' | 'sidebar' */
  /** Form layout: 'table' | 'card' | 'receipt' | 'certificate' | 'chart' | 'sidebar' */
  formLayout?: string
}

interface DocumentTemplatesSettingsProps {
  professional: any
  onUpdate: () => void
}

export default function DocumentTemplatesSettings({ professional, onUpdate }: DocumentTemplatesSettingsProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewScale = useFitToScreenScale(800, 1050, 140)

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [practiceName, setPracticeName] = useState('')
  const [headerText, setHeaderText] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [footerText, setFooterText] = useState('')
  const [tagline, setTagline] = useState('')
  const [signatureStyle, setSignatureStyle] = useState('none')
  const [signatureText, setSignatureText] = useState('')
  const [signatureImageUrl, setSignatureImageUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1e40af')
  const [fontFamily, setFontFamily] = useState('default')
  const [formLayout, setFormLayout] = useState('table')

  useEffect(() => {
    const t = (professional.document_template as DocumentTemplate) || {}
    setPracticeName(t.practiceName ?? professional.business_name ?? '')
    setHeaderText(t.headerText ?? '')
    setLogoUrl(t.logoUrl ?? '')
    setFooterText(t.footerText ?? '')
    setTagline(t.tagline ?? '')
    setSignatureStyle((['elegant', 'medical', 'stamp'] as string[]).includes(t.signatureStyle ?? '') ? 'text' : (t.signatureStyle ?? 'none'))
    setSignatureText(t.signatureText ?? '')
    setSignatureImageUrl(t.signatureImageUrl ?? '')
    setPrimaryColor(t.primaryColor ?? '#1e40af')
    setFontFamily(t.fontFamily ?? 'default')
    setFormLayout(t.formLayout ?? 'table')
  }, [professional])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const template: DocumentTemplate = {
        practiceName: practiceName.trim() || professional.business_name,
        headerText: headerText.trim(),
        logoUrl: logoUrl.trim(),
        footerText: footerText.trim(),
        tagline: tagline.trim(),
        signatureStyle: signatureStyle || 'none',
        signatureText: signatureText.trim(),
        signatureImageUrl: signatureStyle === 'image' ? signatureImageUrl.trim() : undefined,
        primaryColor: primaryColor.trim() || '#1e40af',
        fontFamily: fontFamily || 'default',
        formLayout: formLayout || 'table',
      }

      const { error } = await supabase
        .from('professionals')
        .update({
          document_template: template,
          updated_at: new Date().toISOString(),
        })
        .eq('id', professional.id)

      if (error) throw error

      toast({
        title: 'Template saved',
        description: 'Your document branding will appear on prescriptions and lab requests.',
      })
      onUpdate()
    } catch (error) {
      console.error('Save error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Templates
          </CardTitle>
          <CardDescription>
            Customize how prescriptions and lab requests appear when printed. Your branding will appear at the top and bottom of each document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="practice-name">Practice / Business Name</Label>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                id="practice-name"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                placeholder="e.g. Cabinet Dr. Benali"
              />
            </div>
            <p className="text-xs text-muted-foreground">Shown prominently on printed documents</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="header-text">Header Text (optional)</Label>
            <Input
              id="header-text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="e.g. Médecine Générale | Tél: 0554 12 85 22"
            />
            <p className="text-xs text-muted-foreground">Subtitle or extra line below your name</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline (optional)</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Au service de votre santé"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL (optional)</Label>
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                id="logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <p className="text-xs text-muted-foreground">Direct link to your logo image. Use a square image for best results.</p>
            {logoUrl && (
              <div className="mt-2 p-2 border rounded-lg bg-muted/30">
                <img src={logoUrl} alt="Logo preview" className="h-16 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer-text">Footer Text (optional)</Label>
            <Textarea
              id="footer-text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="e.g. Adresse: 12 Rue Didouche Mourad, Alger&#10;Tél: 0554 12 85 22 | contact@cabinet.dz"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Contact info, address, or legal text at the bottom</p>
          </div>

          {/* Advanced: Colors & typography */}
          <div className="pt-4 border-t space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#1e40af"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Used for headers, accents, and signature</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="font-family">Font family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger id="font-family">
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Segoe UI)</SelectItem>
                    <SelectItem value="serif">Serif (Georgia)</SelectItem>
                    <SelectItem value="modern">Modern (Helvetica)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Document body font</p>
              </div>
            </div>
          </div>

          {/* Form template — choose layout */}
          <div className="pt-4 border-t space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Form template
            </h4>
            <div className="space-y-2">
              <Label>Choose a document layout</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { value: 'table', label: 'Table', desc: 'Standard table', accent: '#1e40af' },
                  { value: 'card', label: 'Card', desc: 'Bordered cards', accent: '#0d9488' },
                  { value: 'receipt', label: 'Receipt', desc: 'Thermal style', accent: '#64748b' },
                  { value: 'certificate', label: 'Certificate', desc: 'Formal frame', accent: '#b45309' },
                  { value: 'chart', label: 'Chart', desc: 'Hospital grid', accent: '#0369a1' },
                  { value: 'sidebar', label: 'Sidebar', desc: 'Branding sidebar', accent: '#7c3aed' },
                ].map((opt) => {
                  const isSelected = formLayout === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormLayout(opt.value)}
                      className={`
                        relative flex flex-col items-start p-1.5 rounded border-2 text-left transition-all min-w-0
                        ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-muted hover:border-primary/40 hover:bg-muted/40'}
                      `}
                    >
                      {isSelected && <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />}
                      <div className="w-full space-y-0.5 py-1 px-1 rounded-sm bg-muted/30 border" style={{ borderColor: `${opt.accent}40` }}>
                        <div className="text-[8px] font-semibold truncate" style={{ color: opt.accent }}>
                          {opt.value === 'card' ? '┌ Card ┐' : opt.value === 'receipt' ? '── Receipt ──' : opt.value === 'certificate' ? '╔ Cert ╗' : opt.value === 'chart' ? '┃ Chart ┃' : opt.value === 'sidebar' ? '│ Side │' : 'RX-001'}
                        </div>
                        <div className="h-px rounded" style={{ backgroundColor: opt.accent, width: opt.value === 'receipt' ? '70%' : '100%' }} />
                      </div>
                      <span className="font-medium text-[10px] mt-1 truncate w-full">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Layout for prescriptions and lab requests. Preview in &quot;View template preview&quot;.</p>
            </div>
          </div>

          {/* Digital signature */}
          <div className="pt-4 border-t space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              Digital signature
            </h4>
            <div className="space-y-2">
              <Label>Signature style — letters in different styles, click to choose</Label>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm">
                {[
                  { value: 'none', label: 'None', fontFamily: undefined },
                  { value: 'text', label: 'Standard', fontFamily: "'Segoe UI', Arial, sans-serif" },
                  { value: 'cursive', label: 'Cursive', fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" },
                  { value: 'formal', label: 'Formal', fontFamily: "Georgia, 'Times New Roman', serif" },
                  { value: 'script', label: 'Script', fontFamily: "'Segoe Script', 'Apple Chancery', cursive" },
                  { value: 'handwritten', label: 'Handwritten', fontFamily: "'Bradley Hand', 'Lucida Handwriting', cursive" },
                  { value: 'image', label: 'Image', fontFamily: undefined, stamp: false },
                ].map((opt) => {
                  const isSelected = signatureStyle === opt.value
                  const displayText = signatureText || 'Dr. Ahmed Benali'
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSignatureStyle(opt.value)}
                      className={`
                        inline-flex items-center gap-1.5 py-0.5 px-0 rounded transition-colors
                        ${isSelected ? 'ring-1 ring-primary ring-offset-1' : 'hover:bg-muted/60'}
                      `}
                    >
                      {opt.value === 'none' ? (
                        <span className="text-muted-foreground italic">None</span>
                      ) : opt.value === 'image' ? (
                        <><ImageIcon className="w-3.5 h-3.5" /><span>Image</span></>
                      ) : (
                        <span style={{ fontFamily: opt.fontFamily, color: primaryColor }}>
                          {displayText}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Letters shown in each style. Use &quot;View template preview&quot; to see the full document.</p>
            </div>
            {signatureStyle !== 'none' && signatureStyle !== 'image' && (
              <div className="space-y-2">
                <Label htmlFor="signature-text">Signature text</Label>
                <Input
                  id="signature-text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="e.g. Dr. Ahmed Benali"
                />
              </div>
            )}
            {signatureStyle === 'image' && (
              <div className="space-y-2">
                <Label htmlFor="signature-image">Signature image URL</Label>
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    id="signature-image"
                    type="url"
                    value={signatureImageUrl}
                    onChange={(e) => setSignatureImageUrl(e.target.value)}
                    placeholder="https://example.com/signature.png"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Use a transparent PNG for best results. Max ~200×56px recommended.</p>
                {signatureImageUrl && (
                  <div className="mt-2 p-2 border rounded-lg bg-muted/30 inline-block">
                    <img src={signatureImageUrl} alt="Signature preview" className="h-12 object-contain max-w-[180px]" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" type="button">
                  <Eye className="h-4 w-4 mr-2" />
                  View template preview
                </Button>
              </DialogTrigger>
              <DialogContent
                size="full"
                resizable={false}
                showCloseButton={false}
                style={isMobile ? { minWidth: 0, minHeight: 0, width: '100%', maxWidth: '100vw', height: '100%', maxHeight: '100dvh' } : { height: '88vh', minHeight: 720 }}
                className="overflow-hidden flex flex-col p-0 max-w-[100vw] max-h-[100dvh] sm:max-h-[90vh]"
              >
                <DialogHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 shrink-0 flex flex-row items-center justify-between gap-2">
                  <DialogTitle className="text-base sm:text-lg">Template preview</DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-muted hover:bg-muted/80"
                    onClick={() => setPreviewOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </DialogHeader>
                <Tabs defaultValue="prescription" className="flex flex-col px-3 sm:px-4 pb-3">
                  <TabsList className="shrink-0 w-fit">
                    <TabsTrigger value="prescription">Prescription</TabsTrigger>
                    <TabsTrigger value="lab">Lab request</TabsTrigger>
                  </TabsList>
                  <TabsContent value="prescription" className="flex-none mt-2 overflow-hidden" style={{ width: 800 * previewScale, height: 1050 * previewScale }}>
                    <iframe
                        srcDoc={getPrescriptionPrintHtml(
                          {
                            prescription_number: 'RX-SAMPLE-001',
                            created_at: new Date().toISOString(),
                            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            diagnosis: 'Example diagnosis',
                            medications: [
                              { medication_name: 'Sample Medication', form: 'Tablet', dosage: '500mg', quantity: 30, frequency: 'Twice daily', duration: '14 days', instructions: 'Take with food' },
                            ],
                            notes: 'Sample notes for preview.',
                          },
                          {
                            practiceName: practiceName || professional.business_name,
                            headerText: headerText || undefined,
                            logoUrl: logoUrl || undefined,
                            footerText: footerText || undefined,
                            tagline: tagline || undefined,
                            signatureStyle: signatureStyle || 'none',
                            signatureText: signatureText || undefined,
                            signatureImageUrl: signatureStyle === 'image' ? signatureImageUrl || undefined : undefined,
                            primaryColor: primaryColor || undefined,
                            fontFamily: fontFamily || undefined,
                            formLayout: formLayout || 'table',
                          }
                        )}
                        title="Prescription template preview"
                        className="bg-white block border-0"
                        style={{ width: 800, height: 1050, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}
                        sandbox="allow-same-origin"
                      />
                  </TabsContent>
                  <TabsContent value="lab" className="flex-none mt-2 overflow-hidden" style={{ width: 800 * previewScale, height: 1050 * previewScale }}>
                    <iframe
                        srcDoc={getLabRequestPrintHtml(
                          {
                            request_number: 'LT-SAMPLE-001',
                            created_at: new Date().toISOString(),
                            priority: 'normal',
                            diagnosis: 'Example diagnosis',
                            clinical_notes: 'Sample clinical notes.',
                            items: [
                              { test_type: { name: 'Complete Blood Count', category: 'Hematology' } },
                              { test_type: { name: 'Glucose Fasting', category: 'Biochemistry' } },
                            ],
                          },
                          {
                            practiceName: practiceName || professional.business_name,
                            headerText: headerText || undefined,
                            logoUrl: logoUrl || undefined,
                            footerText: footerText || undefined,
                            tagline: tagline || undefined,
                            signatureStyle: signatureStyle || 'none',
                            signatureText: signatureText || undefined,
                            signatureImageUrl: signatureStyle === 'image' ? signatureImageUrl || undefined : undefined,
                            primaryColor: primaryColor || undefined,
                            fontFamily: fontFamily || undefined,
                            formLayout: formLayout || 'table',
                          }
                        )}
                        title="Lab request template preview"
                        className="bg-white block border-0"
                        style={{ width: 800, height: 1050, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}
                        sandbox="allow-same-origin"
                      />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

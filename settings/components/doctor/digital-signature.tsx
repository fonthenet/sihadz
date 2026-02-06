'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Pen, Upload, Trash2, Save, Download, Check, 
  FileSignature, Type, ImageIcon as Image
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { createBrowserClient } from '@/lib/supabase/client'

interface DigitalSignatureProps {
  doctorId: string
  existingSignature?: string
  onSave?: (signatureUrl: string) => void
}

export function DigitalSignature({ doctorId, existingSignature, onSave }: DigitalSignatureProps) {
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload'>('draw')
  const [typedName, setTypedName] = useState('')
  const [signatureFont, setSignatureFont] = useState('cursive')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [savedSignature, setSavedSignature] = useState<string | null>(existingSignature || null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createBrowserClient()

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 150

    // Set drawing style
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Clear canvas with white background
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [signatureType])

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Generate typed signature as image
  const generateTypedSignature = (): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 150
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#000'
    ctx.font = signatureFont === 'cursive' 
      ? 'italic 48px "Brush Script MT", cursive'
      : signatureFont === 'elegant'
      ? '48px "Edwardian Script ITC", cursive'
      : '48px "Lucida Handwriting", cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)

    return canvas.toDataURL('image/png')
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Get current signature data
  const getCurrentSignature = (): string | null => {
    switch (signatureType) {
      case 'draw':
        return canvasRef.current?.toDataURL('image/png') || null
      case 'type':
        return typedName ? generateTypedSignature() : null
      case 'upload':
        return uploadedImage
      default:
        return null
    }
  }

  // Save signature
  const saveSignature = async () => {
    const signatureData = getCurrentSignature()
    if (!signatureData) return

    setIsSaving(true)
    try {
      // Convert base64 to blob
      const response = await fetch(signatureData)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const fileName = `signatures/${doctorId}/${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        // If storage not available, save base64 directly
        console.log('Storage not available, saving base64')
        const { error } = await supabase
          .from('doctor_signatures')
          .upsert({
            doctor_id: doctorId,
            signature_data: signatureData,
            signature_type: signatureType,
            is_active: true
          })

        if (error) throw error
        setSavedSignature(signatureData)
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('medical-files')
          .getPublicUrl(fileName)

        // Save to database
        const { error } = await supabase
          .from('doctor_signatures')
          .upsert({
            doctor_id: doctorId,
            signature_url: urlData.publicUrl,
            signature_type: signatureType,
            is_active: true
          })

        if (error) throw error
        setSavedSignature(urlData.publicUrl)
      }

      if (onSave) {
        onSave(savedSignature || signatureData)
      }
    } catch (error) {
      console.error('Failed to save signature:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const SIGNATURE_FONTS = [
    { value: 'cursive', label: 'Classic Cursive' },
    { value: 'elegant', label: 'Elegant Script' },
    { value: 'handwritten', label: 'Handwritten' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Digital Signature
        </CardTitle>
        <CardDescription>
          Create your digital signature for prescriptions and medical documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Signature Preview */}
        {savedSignature && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <Label className="text-sm text-muted-foreground mb-2 block">Current Signature</Label>
            <div className="flex items-center justify-center p-4 bg-white rounded border">
              <img 
                src={savedSignature || "/placeholder.svg"} 
                alt="Current signature" 
                className="max-h-20 object-contain"
              />
            </div>
          </div>
        )}

        {/* Signature Creation Tabs */}
        <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as typeof signatureType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draw">
              <Pen className="h-4 w-4 mr-2" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type">
              <Type className="h-4 w-4 mr-2" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Draw Signature */}
          <TabsContent value="draw" className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-[150px] cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={clearCanvas} className="bg-transparent">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Draw your signature in the box above using your mouse or finger
            </p>
          </TabsContent>

          {/* Type Signature */}
          <TabsContent value="type" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  placeholder="Dr. Ahmed Benali"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Font Style</Label>
                <div className="flex gap-2">
                  {SIGNATURE_FONTS.map(font => (
                    <Button
                      key={font.value}
                      variant={signatureFont === font.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSignatureFont(font.value)}
                      className={signatureFont !== font.value ? 'bg-transparent' : ''}
                    >
                      {font.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {typedName && (
                <div className="p-4 border rounded-lg bg-white">
                  <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                  <div 
                    className="text-4xl text-center py-4"
                    style={{ 
                      fontFamily: signatureFont === 'cursive' 
                        ? '"Brush Script MT", cursive'
                        : signatureFont === 'elegant'
                        ? '"Edwardian Script ITC", cursive'
                        : '"Lucida Handwriting", cursive',
                      fontStyle: 'italic'
                    }}
                  >
                    {typedName}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Upload Signature */}
          <TabsContent value="upload" className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              {uploadedImage ? (
                <div className="space-y-4">
                  <img 
                    src={uploadedImage || "/placeholder.svg"} 
                    alt="Uploaded signature" 
                    className="max-h-20 mx-auto object-contain"
                  />
                  <p className="text-sm text-muted-foreground">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload signature image</p>
                  <p className="text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={saveSignature}
          disabled={isSaving || !getCurrentSignature()}
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Signature
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

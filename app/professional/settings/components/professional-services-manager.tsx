'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react'
import { SectionLoading, LoadingSpinner } from '@/components/ui/page-loading'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/i18n/language-context'
import { cn } from '@/lib/utils'

export interface ProfessionalService {
  id: string
  professional_id: string
  service_name: string
  service_description: string | null
  name_ar: string | null
  description_ar: string | null
  price: number | null
  duration: number | null
  image_url: string | null
  image_urls: string[] | null
  display_order: number
  is_active: boolean
  created_at?: string
}

interface ProfessionalServicesManagerProps {
  professionalId: string
  onUpdate?: () => void
}

const labels = {
  en: {
    title: 'Services Offered',
    description: 'Add services you offer with photos and details. These appear on your profile.',
    addService: 'Add Service',
    editService: 'Edit Service',
    name: 'Service Name',
    nameAr: 'Service Name (Arabic)',
    description: 'Description',
    descriptionAr: 'Description (Arabic)',
    price: 'Price (DZD)',
    duration: 'Duration (minutes)',
    image: 'Image',
    uploadImage: 'Upload Image',
    active: 'Visible on profile',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    noServices: 'No services yet. Add your first service to showcase on your profile.',
    saved: 'Service saved',
    deleted: 'Service removed',
    error: 'Failed to save',
  },
  fr: {
    title: 'Services proposés',
    description: 'Ajoutez les services que vous proposez avec photos et détails. Ils apparaissent sur votre profil.',
    addService: 'Ajouter un service',
    editService: 'Modifier le service',
    name: 'Nom du service',
    nameAr: 'Nom du service (arabe)',
    description: 'Description',
    descriptionAr: 'Description (arabe)',
    price: 'Prix (DZD)',
    duration: 'Durée (minutes)',
    image: 'Image',
    uploadImage: 'Télécharger une image',
    active: 'Visible sur le profil',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    noServices: 'Aucun service. Ajoutez votre premier service pour l\'afficher sur votre profil.',
    saved: 'Service enregistré',
    deleted: 'Service supprimé',
    error: 'Échec de l\'enregistrement',
  },
  ar: {
    title: 'الخدمات المقدمة',
    description: 'أضف الخدمات التي تقدمها مع الصور والتفاصيل. تظهر على ملفك الشخصي.',
    addService: 'إضافة خدمة',
    editService: 'تعديل الخدمة',
    name: 'اسم الخدمة',
    nameAr: 'اسم الخدمة (عربي)',
    description: 'الوصف',
    descriptionAr: 'الوصف (عربي)',
    price: 'السعر (د.ج)',
    duration: 'المدة (دقائق)',
    image: 'الصورة',
    uploadImage: 'رفع صورة',
    active: 'ظاهر على الملف',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    noServices: 'لا توجد خدمات. أضف خدمتك الأولى لعرضها على ملفك.',
    saved: 'تم حفظ الخدمة',
    deleted: 'تم حذف الخدمة',
    error: 'فشل الحفظ',
  },
}

export function ProfessionalServicesManager({ professionalId, onUpdate }: ProfessionalServicesManagerProps) {
  const { toast } = useToast()
  const { language } = useLanguage()
  const l = labels[language] || labels.en
  const [services, setServices] = useState<ProfessionalService[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    service_name: '',
    name_ar: '',
    service_description: '',
    description_ar: '',
    price: '',
    duration: '',
    image_url: '',
    is_active: true,
  })

  const fetchServices = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('professional_services')
      .select('*')
      .eq('professional_id', professionalId)
      .order('display_order', { ascending: true })
    if (!error) setServices((data as ProfessionalService[]) || [])
    setLoading(false)
  }, [professionalId])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const openAdd = () => {
    setEditingId(null)
    setForm({
      service_name: '',
      name_ar: '',
      service_description: '',
      description_ar: '',
      price: '',
      duration: '',
      image_url: '',
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (s: ProfessionalService) => {
    setEditingId(s.id)
    setForm({
      service_name: s.service_name || '',
      name_ar: s.name_ar || '',
      service_description: s.service_description || '',
      description_ar: s.description_ar || '',
      price: s.price != null ? String(s.price) : '',
      duration: s.duration != null ? String(s.duration) : '',
      image_url: s.image_url || '',
      is_active: s.is_active ?? true,
    })
    setDialogOpen(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('professionalId', professionalId)
      const res = await fetch('/api/professional-services/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const data = await res.json()
      if (data.url) {
        setForm((f) => ({ ...f, image_url: data.url }))
      } else {
        toast({ variant: 'destructive', title: l.error, description: data.error || 'Upload failed' })
      }
    } catch {
      toast({ variant: 'destructive', title: l.error, description: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const payload = {
        service_name: form.service_name.trim() || null,
        name_ar: form.name_ar.trim() || null,
        service_description: form.service_description.trim() || null,
        description_ar: form.description_ar.trim() || null,
        price: form.price ? parseInt(form.price, 10) : null,
        duration: form.duration ? parseInt(form.duration, 10) : null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
        display_order: editingId ? services.find((s) => s.id === editingId)?.display_order ?? 0 : services.length,
      }

      if (editingId) {
        const { error } = await supabase
          .from('professional_services')
          .update(payload)
          .eq('id', editingId)
          .eq('professional_id', professionalId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('professional_services')
          .insert({ professional_id: professionalId, ...payload })
        if (error) throw error
      }

      toast({ title: l.saved })
      setDialogOpen(false)
      fetchServices()
      onUpdate?.()
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: l.error })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'حذف هذه الخدمة؟' : 'Delete this service?')) return
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('professional_services')
        .delete()
        .eq('id', id)
        .eq('professional_id', professionalId)
      if (error) throw error
      toast({ title: l.deleted })
      fetchServices()
      onUpdate?.()
    } catch {
      toast({ variant: 'destructive', title: l.error })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <SectionLoading label={language === 'ar' ? 'جاري التحميل...' : 'Loading...'} minHeight="min-h-[200px]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{l.title}</CardTitle>
        <CardDescription>{l.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              {l.addService}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? l.editService : l.addService}</DialogTitle>
              <DialogDescription>{l.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>{l.name}</Label>
                <Input
                  value={form.service_name}
                  onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
                  placeholder="e.g. General Consultation"
                />
              </div>
              <div>
                <Label>{l.nameAr}</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                  placeholder="مثال: استشارة عامة"
                  dir="rtl"
                />
              </div>
              <div>
                <Label>{l.description}</Label>
                <Textarea
                  value={form.service_description}
                  onChange={(e) => setForm((f) => ({ ...f, service_description: e.target.value }))}
                  placeholder="Describe what this service includes..."
                  rows={3}
                />
              </div>
              <div>
                <Label>{l.descriptionAr}</Label>
                <Textarea
                  value={form.description_ar}
                  onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
                  placeholder="وصف الخدمة..."
                  rows={3}
                  dir="rtl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{l.price}</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="2500"
                  />
                </div>
                <div>
                  <Label>{l.duration}</Label>
                  <Input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <Label>{l.image}</Label>
                <div className="flex items-center gap-3 mt-2">
                  {form.image_url && (
                    <img
                      src={form.image_url}
                      alt=""
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                  )}
                  <div className="flex flex-col gap-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={uploading}
                      className="max-w-[200px]"
                    />
                    {uploading && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <LoadingSpinner size="sm" className="h-3 w-3" />
                        {l.uploadImage}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">{l.active}</Label>
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {l.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.service_name.trim()}>
                {saving ? <LoadingSpinner size="sm" /> : <>{l.save}</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{l.noServices}</p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  !s.is_active && 'opacity-60'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.service_name}</p>
                  {s.price != null && (
                    <p className="text-sm text-muted-foreground">{s.price} DZD</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

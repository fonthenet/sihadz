'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, Trash2, RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { seedNewUserData } from '@/app/actions/seed'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function DataManagerPage() {
  const { language, dir } = useLanguage()
  const { user, profile } = useAuth()
  const supabase = createBrowserClient()
  
  const [isSeeding, setIsSeeding] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSeedData = async () => {
    if (!user || !profile?.user_type) return
    
    setIsSeeding(true)
    setMessage(null)
    
    try {
      const result = await seedNewUserData(user.id, profile.user_type as 'patient' | 'doctor' | 'pharmacist')
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: language === 'ar' 
            ? 'تم إنشاء البيانات التجريبية بنجاح'
            : language === 'fr'
            ? 'Données de test créées avec succès'
            : 'Test data created successfully'
        })
        
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setMessage({
          type: 'error',
          text: language === 'ar' 
            ? 'فشل في إنشاء البيانات التجريبية'
            : language === 'fr'
            ? 'Échec de la création des données de test'
            : 'Failed to create test data'
        })
      }
    } catch (error) {
      console.error('[v0] Error seeding data:', error)
      setMessage({
        type: 'error',
        text: language === 'ar' 
          ? 'حدث خطأ أثناء إنشاء البيانات'
          : language === 'fr'
          ? 'Une erreur est survenue lors de la création des données'
          : 'An error occurred while creating data'
      })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleClearData = async () => {
    if (!user) return
    
    setIsClearing(true)
    setMessage(null)
    
    try {
      // Delete data from all related tables
      const tables = [
        'family_members',
        'documents',
        'prescriptions',
        'appointments',
        'notifications',
        'messages',
        'conversations',
        'reviews',
        'payments'
      ]
      
      if (profile?.user_type === 'doctor') {
        tables.push('doctors')
      } else if (profile?.user_type === 'pharmacist') {
        tables.push('pharmacies')
      }
      
      for (const table of tables) {
        if (table === 'appointments' || table === 'prescriptions') {
          // For appointments and prescriptions, delete where user is patient or doctor
          await supabase
            .from(table)
            .delete()
            .eq('patient_id', user.id)
          
          if (table === 'appointments') {
            // Also delete as doctor
            const { data: doctorProfile } = await supabase
              .from('doctors')
              .select('id')
              .eq('user_id', user.id)
              .single()
            
            if (doctorProfile) {
              await supabase
                .from('appointments')
                .delete()
                .eq('doctor_id', doctorProfile.id)
            }
          }
        } else if (table === 'doctors' || table === 'pharmacies') {
          await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id)
        } else {
          await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id)
        }
      }
      
      setMessage({
        type: 'success',
        text: language === 'ar' 
          ? 'تم حذف جميع البيانات بنجاح'
          : language === 'fr'
          ? 'Toutes les données ont été supprimées avec succès'
          : 'All data deleted successfully'
      })
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('[v0] Error clearing data:', error)
      setMessage({
        type: 'error',
        text: language === 'ar' 
          ? 'فشل في حذف البيانات'
          : language === 'fr'
          ? 'Échec de la suppression des données'
          : 'Failed to delete data'
      })
    } finally {
      setIsClearing(false)
      setShowClearDialog(false)
    }
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            {language === 'ar' ? 'إدارة البيانات التجريبية' : language === 'fr' ? 'Gestion des données de test' : 'Test Data Manager'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'قم بإنشاء أو حذف بيانات تجريبية لاختبار التطبيق'
              : language === 'fr'
              ? 'Créez ou supprimez des données de test pour tester l\'application'
              : 'Create or delete test data to test the application'}
          </p>
        </div>

        {/* Message */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Seed Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                {language === 'ar' ? 'إنشاء بيانات تجريبية' : language === 'fr' ? 'Créer des données de test' : 'Create Test Data'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'قم بإنشاء بيانات تجريبية واقعية لحسابك'
                  : language === 'fr'
                  ? 'Créez des données de test réalistes pour votre compte'
                  : 'Create realistic test data for your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'سيتم إنشاء:' : language === 'fr' ? 'Sera créé:' : 'Will create:'}
                </div>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  {profile?.user_type === 'patient' && (
                    <>
                      <li>{language === 'ar' ? 'أفراد العائلة (3)' : language === 'fr' ? 'Membres de la famille (3)' : 'Family members (3)'}</li>
                      <li>{language === 'ar' ? 'مواعيد (3)' : language === 'fr' ? 'Rendez-vous (3)' : 'Appointments (3)'}</li>
                      <li>{language === 'ar' ? 'وصفة طبية (1)' : language === 'fr' ? 'Ordonnance (1)' : 'Prescription (1)'}</li>
                      <li>{language === 'ar' ? 'بطاقة شفاء' : language === 'fr' ? 'Carte Chifa' : 'Chifa card'}</li>
                      <li>{language === 'ar' ? 'إشعارات (2)' : language === 'fr' ? 'Notifications (2)' : 'Notifications (2)'}</li>
                    </>
                  )}
                  {profile?.user_type === 'doctor' && (
                    <>
                      <li>{language === 'ar' ? 'ملف طبيب كامل' : language === 'fr' ? 'Profil médecin complet' : 'Complete doctor profile'}</li>
                      <li>{language === 'ar' ? 'مواعيد (2)' : language === 'fr' ? 'Rendez-vous (2)' : 'Appointments (2)'}</li>
                      <li>{language === 'ar' ? 'إشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}</li>
                    </>
                  )}
                  {profile?.user_type === 'pharmacist' && (
                    <>
                      <li>{language === 'ar' ? 'ملف صيدلية كامل' : language === 'fr' ? 'Profil pharmacie complet' : 'Complete pharmacy profile'}</li>
                      <li>{language === 'ar' ? 'وصفات طبية مخصصة' : language === 'fr' ? 'Ordonnances assignées' : 'Assigned prescriptions'}</li>
                      <li>{language === 'ar' ? 'إشعارات' : language === 'fr' ? 'Notifications' : 'Notifications'}</li>
                    </>
                  )}
                </ul>
                <Button 
                  onClick={handleSeedData} 
                  disabled={isSeeding}
                  className="w-full"
                >
                  {isSeeding ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {language === 'ar' ? 'جاري الإنشاء...' : language === 'fr' ? 'Création...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إنشاء البيانات' : language === 'fr' ? 'Créer les données' : 'Create Data'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Clear Data */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                {language === 'ar' ? 'حذف جميع البيانات' : language === 'fr' ? 'Supprimer toutes les données' : 'Delete All Data'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'قم بحذف جميع البيانات التجريبية من حسابك'
                  : language === 'fr'
                  ? 'Supprimez toutes les données de test de votre compte'
                  : 'Remove all test data from your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert className="border-amber-500 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    {language === 'ar' 
                      ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه'
                      : language === 'fr'
                      ? 'Attention: Cette action est irréversible'
                      : 'Warning: This action cannot be undone'}
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={() => setShowClearDialog(true)}
                  disabled={isClearing}
                  variant="destructive"
                  className="w-full"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {language === 'ar' ? 'جاري الحذف...' : language === 'fr' ? 'Suppression...' : 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'حذف جميع البيانات' : language === 'fr' ? 'Supprimer toutes les données' : 'Delete All Data'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {language === 'ar' ? 'تأكيد الحذف' : language === 'fr' ? 'Confirmer la suppression' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد أنك تريد حذف جميع البيانات التجريبية؟ لا يمكن التراجع عن هذا الإجراء.'
                : language === 'fr'
                ? 'Êtes-vous sûr de vouloir supprimer toutes les données de test ? Cette action ne peut pas être annulée.'
                : 'Are you sure you want to delete all test data? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ar' ? 'نعم، احذف كل شيء' : language === 'fr' ? 'Oui, tout supprimer' : 'Yes, Delete Everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

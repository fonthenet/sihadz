'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
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
  
  const [isClearing, setIsClearing] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
      <div className="w-full py-4 sm:py-6">
        {/* Header */}
        <div className="mb-8 px-4 sm:px-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary dark:text-emerald-400" />
            {language === 'ar' ? 'إدارة البيانات' : language === 'fr' ? 'Gestion des données' : 'Data Manager'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'احذف بياناتك من التطبيق'
              : language === 'fr'
              ? 'Supprimez vos données de l\'application'
              : 'Remove your data from the application'}
          </p>
        </div>

        {/* Message */}
        {message && (
          <Alert className={`mb-6 mx-4 sm:mx-6 ${message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
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
        <div className="grid gap-6 md:grid-cols-1 max-w-xl px-4 sm:px-6">
          {/* Clear Data */}
          <Card className="rounded-none sm:rounded-xl border-destructive/30">
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

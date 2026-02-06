'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createBrowserClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Loading from './loading'
import { PhoneInput } from '@/components/ui/phone-input'

import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Ban,
  CheckCircle,
  Mail,
  Phone,
  Calendar,
  MapPin,
  UserPlus,
  Download,
  RefreshCw,
  Shield,
  User,
  Users,
  Stethoscope
} from 'lucide-react'

interface UserProfile {
  id: string
  full_name: string
  full_name_ar?: string
  email: string
  phone?: string
  user_type: string
  wilaya_code?: string
  city?: string
  avatar_url?: string
  is_verified: boolean
  created_at: string
  chifa_number?: string
}

export default function UsersManagementPage() {
  const { language, dir } = useLanguage()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    user_type: '',
    is_verified: false
  })
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    phone: '',
    user_type: 'patient',
    password: ''
  })

  const texts = {
    en: {
      title: 'Users Management',
      description: 'Manage all platform users',
      search: 'Search users...',
      filter: 'Filter',
      all: 'All Users',
      patients: 'Patients',
      doctors: 'Doctors',
      addUser: 'Add User',
      export: 'Export',
      refresh: 'Refresh',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      type: 'Type',
      status: 'Status',
      joined: 'Joined',
      actions: 'Actions',
      view: 'View',
      edit: 'Edit',
      delete: 'Delete',
      suspend: 'Suspend',
      verified: 'Verified',
      unverified: 'Unverified',
      patient: 'Patient',
      doctor: 'Doctor',
      admin: 'Admin',
      userDetails: 'User Details',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      deleteConfirm: 'Are you sure you want to delete this user? This action cannot be undone.',
      cancel: 'Cancel',
      save: 'Save Changes',
      confirmDelete: 'Yes, Delete',
      noUsers: 'No users found',
      totalUsers: 'Total Users',
      location: 'Location',
      chifaNumber: 'CHIFA Number',
      verify: 'Verify',
      sendEmail: 'Send Email'
    },
    fr: {
      title: 'Gestion des Utilisateurs',
      description: 'Gérer tous les utilisateurs de la plateforme',
      search: 'Rechercher des utilisateurs...',
      filter: 'Filtrer',
      all: 'Tous les utilisateurs',
      patients: 'Patients',
      doctors: 'Médecins',
      addUser: 'Ajouter',
      export: 'Exporter',
      refresh: 'Actualiser',
      name: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      type: 'Type',
      status: 'Statut',
      joined: 'Inscrit le',
      actions: 'Actions',
      view: 'Voir',
      edit: 'Modifier',
      delete: 'Supprimer',
      suspend: 'Suspendre',
      verified: 'Vérifié',
      unverified: 'Non vérifié',
      patient: 'Patient',
      doctor: 'Médecin',
      admin: 'Admin',
      userDetails: 'Détails de l\'utilisateur',
      editUser: 'Modifier l\'utilisateur',
      deleteUser: 'Supprimer l\'utilisateur',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cet utilisateur? Cette action est irréversible.',
      cancel: 'Annuler',
      save: 'Enregistrer',
      confirmDelete: 'Oui, Supprimer',
      noUsers: 'Aucun utilisateur trouvé',
      totalUsers: 'Total Utilisateurs',
      location: 'Localisation',
      chifaNumber: 'Numéro CHIFA',
      verify: 'Vérifier',
      sendEmail: 'Envoyer Email'
    },
    ar: {
      title: 'إدارة المستخدمين',
      description: 'إدارة جميع مستخدمي المنصة',
      search: 'البحث عن المستخدمين...',
      filter: 'تصفية',
      all: 'جميع المستخدمين',
      patients: 'المرضى',
      doctors: 'الأطباء',
      addUser: 'إضافة مستخدم',
      export: 'تصدير',
      refresh: 'تحديث',
      name: 'الاسم',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      type: 'النوع',
      status: 'الحالة',
      joined: 'تاريخ الانضمام',
      actions: 'الإجراءات',
      view: 'عرض',
      edit: 'تعديل',
      delete: 'حذف',
      suspend: 'تعليق',
      verified: 'موثق',
      unverified: 'غير موثق',
      patient: 'مريض',
      doctor: 'طبيب',
      admin: 'مدير',
      userDetails: 'تفاصيل المستخدم',
      editUser: 'تعديل المستخدم',
      deleteUser: 'حذف المستخدم',
      deleteConfirm: 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.',
      cancel: 'إلغاء',
      save: 'حفظ التغييرات',
      confirmDelete: 'نعم، احذف',
      noUsers: 'لا يوجد مستخدمون',
      totalUsers: 'إجمالي المستخدمين',
      location: 'الموقع',
      chifaNumber: 'رقم الشيفا',
      verify: 'تحقق',
      sendEmail: 'إرسال بريد'
    }
  }

  const t = texts[language]

  useEffect(() => {
    fetchUsers()
  }, [filterType])

  const fetchUsers = async () => {
    setIsLoading(true)
    const supabase = createBrowserClient()
    
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterType === 'patients') {
        query = query.eq('user_type', 'patient')
      } else if (filterType === 'doctors') {
        query = query.eq('user_type', 'doctor')
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user)
    setIsViewModalOpen(true)
  }

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      user_type: user.user_type || 'patient',
      is_verified: user.is_verified || false
    })
    setIsEditModalOpen(true)
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return
    
    const supabase = createBrowserClient()
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          user_type: editForm.user_type,
          is_verified: editForm.is_verified
        })
        .eq('id', selectedUser.id)

      if (error) throw error
      
      fetchUsers()
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    const supabase = createBrowserClient()
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id)

      if (error) throw error
      
      fetchUsers()
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleVerifyUser = async (userId: string) => {
    const supabase = createBrowserClient()
    
    try {
      console.log('[v0] Verifying user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', userId)
        .select()

      if (error) {
        console.error('[v0] Error verifying user:', error)
        alert(`Failed to verify user: ${error.message}`)
        throw error
      }
      
      console.log('[v0] User verified successfully:', data)
      alert('User verified successfully!')
      fetchUsers()
    } catch (error: any) {
      console.error('[v0] Error verifying user:', error)
      alert(`Error: ${error.message || 'Failed to verify user'}`)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      alert('Please fill in all required fields')
      return
    }

    const supabase = createBrowserClient()
    
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      })

      if (authError) throw authError

      if (authData.user) {
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: newUser.full_name,
            phone: newUser.phone,
            user_type: newUser.user_type,
          })
          .eq('id', authData.user.id)

        if (profileError) throw profileError
      }

      alert('User added successfully!')
      setNewUser({ email: '', full_name: '', phone: '', user_type: 'patient', password: '' })
      setIsAddModalOpen(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Error adding user:', error)
      alert(`Failed to add user: ${error.message}`)
    }
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchQuery)
    )
  })

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <Stethoscope className="h-4 w-4" />
      case 'admin': return <Shield className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'doctor': return t.doctor
      case 'admin': return t.admin
      default: return t.patient
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
          <div className={dir === 'rtl' ? 'text-right' : ''}>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground">{t.description}</p>
          </div>
          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" size="sm" onClick={fetchUsers} className="bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refresh}
            </Button>
            <Button variant="outline" size="sm" className="bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              {t.export}
            </Button>
            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t.addUser}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalUsers}</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">{t.patients}</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.user_type === 'patient').length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <User className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div>
                  <p className="text-sm text-muted-foreground">{t.doctors}</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.user_type === 'doctor').length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className={`flex flex-col sm:flex-row gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse' : ''}`}>
              <div className="relative flex-1">
                <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <Input
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${dir === 'rtl' ? 'pr-10 text-right' : 'pl-10'}`}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t.filter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="patients">{t.patients}</SelectItem>
                  <SelectItem value="doctors">{t.doctors}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t.noUsers}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                      <th className="px-4 py-3 font-medium text-sm">{t.name}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.email}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.phone}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.type}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.status}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.joined}</th>
                      <th className="px-4 py-3 font-medium text-sm">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {user.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.full_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{user.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            {getUserTypeIcon(user.user_type)}
                            {getUserTypeLabel(user.user_type)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_verified ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t.verified}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                              onClick={() => handleVerifyUser(user.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t.verify}
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t.view}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t.edit}
                              </DropdownMenuItem>
                              {!user.is_verified && (
                                <DropdownMenuItem onClick={() => handleVerifyUser(user.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t.verify}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                {t.sendEmail}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Ban className="h-4 w-4 mr-2" />
                                {t.suspend}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsDeleteModalOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View User Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t.userDetails}</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {selectedUser.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser.full_name}</h3>
                    <Badge variant="outline">{getUserTypeLabel(selectedUser.user_type)}</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedUser.email}</span>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.phone}</span>
                    </div>
                  )}
                  {selectedUser.wilaya_code && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.wilaya_code} - {selectedUser.city}</span>
                    </div>
                  )}
                  {selectedUser.chifa_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{t.chifaNumber}: {selectedUser.chifa_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{t.joined}: {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="bg-transparent">
                {t.cancel}
              </Button>
              <Button onClick={() => {
                setIsViewModalOpen(false)
                if (selectedUser) handleEditUser(selectedUser)
              }}>
                {t.edit}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t.editUser}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.name}</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input value={editForm.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.type}</Label>
                <Select value={editForm.user_type} onValueChange={(v) => setEditForm({ ...editForm, user_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">{t.patient}</SelectItem>
                    <SelectItem value="doctor">{t.doctor}</SelectItem>
                    <SelectItem value="admin">{t.admin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={editForm.is_verified}
                  onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="verified">{t.verified}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="bg-transparent">
                {t.cancel}
              </Button>
              <Button onClick={handleSaveUser}>
                {t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">{t.deleteUser}</DialogTitle>
              <DialogDescription>{t.deleteConfirm}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="bg-transparent">
                {t.cancel}
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                {t.confirmDelete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add User Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t.addUser}</DialogTitle>
              <DialogDescription>Create a new user account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <PhoneInput
                  value={newUser.phone}
                  onChange={(value) => setNewUser({ ...newUser, phone: value })}
                />
              </div>
              <div className="space-y-2">
                <Label>User Type</Label>
                <Select value={newUser.user_type} onValueChange={(v) => setNewUser({ ...newUser, user_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">{t.patient}</SelectItem>
                    <SelectItem value="doctor">{t.doctor}</SelectItem>
                    <SelectItem value="admin">{t.admin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleAddUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Suspense>
  )
}

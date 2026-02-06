'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { 
  Search, Plus, Star, StarOff, MapPin, Phone, Mail, 
  Building2, Pill, FlaskConical, Stethoscope, Ambulance,
  Link2, Unlink, MessageSquare, Clock, CheckCircle, XCircle,
  Filter, ChevronRight, Settings
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface ProviderConnection {
  id: string
  provider_id: string
  provider_type: string
  connected_to_id: string
  connected_to_type: string
  connection_type: 'preferred' | 'affiliated' | 'contracted'
  notes?: string
  status: 'pending' | 'active' | 'inactive'
  created_at: string
  connected_provider?: {
    id: string
    business_name: string
    professional_type: string
    wilaya: string
    commune?: string
    phone?: string
    email?: string
    avatar_url?: string
    average_rating?: number
    total_reviews?: number
  }
}

interface ProviderNetworkProps {
  professionalId: string
  professionalType: string
  language?: 'ar' | 'fr' | 'en'
}

export default function ProviderNetwork({ 
  professionalId, 
  professionalType,
  language = 'ar' 
}: ProviderNetworkProps) {
  const { toast } = useToast()
  const supabase = createBrowserClient()
  
  const [connections, setConnections] = useState<ProviderConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<ProviderConnection | null>(null)
  
  // Search state
  const [providerTypeFilter, setProviderTypeFilter] = useState<string>('all')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProviderToAdd, setSelectedProviderToAdd] = useState<any>(null)
  const [connectionNotes, setConnectionNotes] = useState('')
  const [connectionType, setConnectionType] = useState<'preferred' | 'affiliated' | 'contracted'>('preferred')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const labels = {
    ar: {
      myNetwork: 'شبكة مقدمي الخدمات',
      pharmacies: 'الصيدليات',
      laboratories: 'المختبرات',
      clinics: 'العيادات',
      doctors: 'الأطباء',
      ambulances: 'سيارات الإسعاف',
      all: 'الكل',
      preferred: 'مفضل',
      affiliated: 'تابع',
      contracted: 'متعاقد',
      addConnection: 'إضافة اتصال',
      search: 'بحث...',
      noConnections: 'لا توجد اتصالات',
      connect: 'اتصال',
      disconnect: 'قطع الاتصال',
      message: 'مراسلة',
      viewDetails: 'عرض التفاصيل',
      notes: 'ملاحظات',
      selectType: 'اختر نوع الاتصال',
      cancel: 'إلغاء',
      save: 'حفظ',
      connectionAdded: 'تمت إضافة الاتصال بنجاح',
      connectionRemoved: 'تم إزالة الاتصال',
      searchProviders: 'ابحث عن مقدمي الخدمات...',
      noResults: 'لا توجد نتائج',
      rating: 'التقييم',
      reviews: 'تقييمات',
      location: 'الموقع',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      since: 'منذ',
      makePrimary: 'تعيين كمفضل',
      alreadyConnected: 'متصل بالفعل',
    },
    fr: {
      myNetwork: 'Mon réseau de prestataires',
      pharmacies: 'Pharmacies',
      laboratories: 'Laboratoires',
      clinics: 'Cliniques',
      doctors: 'Médecins',
      ambulances: 'Ambulances',
      all: 'Tout',
      preferred: 'Préféré',
      affiliated: 'Affilié',
      contracted: 'Contracté',
      addConnection: 'Ajouter une connexion',
      search: 'Rechercher...',
      noConnections: 'Aucune connexion',
      connect: 'Connecter',
      disconnect: 'Déconnecter',
      message: 'Message',
      viewDetails: 'Voir les détails',
      notes: 'Notes',
      selectType: 'Sélectionner le type de connexion',
      cancel: 'Annuler',
      save: 'Enregistrer',
      connectionAdded: 'Connexion ajoutée avec succès',
      connectionRemoved: 'Connexion supprimée',
      searchProviders: 'Rechercher des prestataires...',
      noResults: 'Aucun résultat',
      rating: 'Évaluation',
      reviews: 'avis',
      location: 'Emplacement',
      phone: 'Téléphone',
      email: 'Email',
      since: 'Depuis',
      makePrimary: 'Définir comme préféré',
      alreadyConnected: 'Déjà connecté',
    },
    en: {
      myNetwork: 'My Provider Network',
      pharmacies: 'Pharmacies',
      laboratories: 'Laboratories',
      clinics: 'Clinics',
      doctors: 'Doctors',
      ambulances: 'Ambulances',
      all: 'All',
      preferred: 'Preferred',
      affiliated: 'Affiliated',
      contracted: 'Contracted',
      addConnection: 'Add Connection',
      search: 'Search...',
      noConnections: 'No connections',
      connect: 'Connect',
      disconnect: 'Disconnect',
      message: 'Message',
      viewDetails: 'View Details',
      notes: 'Notes',
      selectType: 'Select connection type',
      cancel: 'Cancel',
      save: 'Save',
      connectionAdded: 'Connection added successfully',
      connectionRemoved: 'Connection removed',
      searchProviders: 'Search for providers...',
      noResults: 'No results',
      rating: 'Rating',
      reviews: 'reviews',
      location: 'Location',
      phone: 'Phone',
      email: 'Email',
      since: 'Since',
      makePrimary: 'Make Primary',
      alreadyConnected: 'Already connected',
    },
  }
  
  const l = labels[language]

  // Get provider type icon
  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'pharmacy': return <Pill className="h-5 w-5" />
      case 'laboratory': return <FlaskConical className="h-5 w-5" />
      case 'clinic': return <Building2 className="h-5 w-5" />
      case 'doctor': return <Stethoscope className="h-5 w-5" />
      case 'ambulance': return <Ambulance className="h-5 w-5" />
      default: return <Building2 className="h-5 w-5" />
    }
  }

  // Get provider type label
  const getProviderTypeLabel = (type: string) => {
    switch (type) {
      case 'pharmacy': return l.pharmacies
      case 'laboratory': return l.laboratories
      case 'clinic': return l.clinics
      case 'doctor': return l.doctors
      case 'ambulance': return l.ambulances
      default: return type
    }
  }

  // Get connection type badge
  const getConnectionTypeBadge = (type: string) => {
    switch (type) {
      case 'preferred':
        return <Badge className="bg-yellow-500"><Star className="h-3 w-3 me-1" />{l.preferred}</Badge>
      case 'affiliated':
        return <Badge variant="secondary">{l.affiliated}</Badge>
      case 'contracted':
        return <Badge variant="outline">{l.contracted}</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  // Load connections
  const loadConnections = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('provider_connections')
        .select('*')
        .eq('provider_id', professionalId)
        .eq('status', 'active')
        .order('connection_type')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrich with provider details
      const enrichedConnections = await Promise.all(
        (data || []).map(async (conn) => {
          const { data: provider } = await supabase
            .from('professionals')
            .select('id, business_name, professional_type, wilaya, commune, phone, email, avatar_url')
            .eq('id', conn.connected_to_id)
            .single()

          // Get profile data for ratings
          const { data: profile } = await supabase
            .from('professional_profiles')
            .select('average_rating, total_reviews')
            .eq('professional_id', conn.connected_to_id)
            .single()

          return {
            ...conn,
            connected_provider: provider ? {
              ...provider,
              average_rating: profile?.average_rating || 0,
              total_reviews: profile?.total_reviews || 0
            } : null
          }
        })
      )

      setConnections(enrichedConnections.filter(c => c.connected_provider))
    } catch (error) {
      console.error('Error loading connections:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [professionalId])

  // Search providers to add
  const searchProviders = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      let dbQuery = supabase
        .from('professionals')
        .select(`
          id, business_name, professional_type, wilaya, commune, phone, avatar_url,
          professional_profiles(average_rating, total_reviews)
        `)
        .neq('id', professionalId)
        .eq('status', 'verified')
        .or(`business_name.ilike.%${query}%`)

      if (providerTypeFilter !== 'all') {
        dbQuery = dbQuery.eq('professional_type', providerTypeFilter)
      }

      const { data, error } = await dbQuery.limit(10)

      if (error) throw error

      // Filter out already connected providers
      const connectedIds = connections.map(c => c.connected_to_id)
      const filtered = (data || []).filter(p => !connectedIds.includes(p.id))

      setSearchResults(filtered.map(p => ({
        ...p,
        average_rating: p.professional_profiles?.[0]?.average_rating || 0,
        total_reviews: p.professional_profiles?.[0]?.total_reviews || 0
      })))
    } catch (error) {
      console.error('Error searching providers:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Add connection
  const handleAddConnection = async () => {
    if (!selectedProviderToAdd) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('provider_connections')
        .insert({
          provider_id: professionalId,
          provider_type: professionalType,
          connected_to_id: selectedProviderToAdd.id,
          connected_to_type: selectedProviderToAdd.professional_type,
          connection_type: connectionType,
          notes: connectionNotes,
          status: 'active'
        })

      if (error) throw error

      toast({ title: l.connectionAdded })
      setShowAddDialog(false)
      setSelectedProviderToAdd(null)
      setConnectionNotes('')
      setConnectionType('preferred')
      loadConnections()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove connection
  const handleRemoveConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('provider_connections')
        .update({ status: 'inactive' })
        .eq('id', connectionId)

      if (error) throw error

      toast({ title: l.connectionRemoved })
      loadConnections()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Update connection type
  const handleUpdateConnectionType = async (connectionId: string, newType: 'preferred' | 'affiliated' | 'contracted') => {
    try {
      const { error } = await supabase
        .from('provider_connections')
        .update({ connection_type: newType })
        .eq('id', connectionId)

      if (error) throw error

      loadConnections()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Filter connections based on active tab
  const filteredConnections = connections.filter(conn => {
    if (activeTab === 'all') return true
    return conn.connected_provider?.professional_type === activeTab
  }).filter(conn => {
    if (!searchQuery) return true
    return conn.connected_provider?.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Count by type
  const countByType = (type: string) => {
    return connections.filter(c => c.connected_provider?.professional_type === type).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{l.myNetwork}</h2>
          <p className="text-muted-foreground">
            {connections.length} {language === 'ar' ? 'اتصال' : 'connections'}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 me-2" />
          {l.addConnection}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={l.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Tabs by provider type */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all" className="gap-2">
            {l.all}
            <Badge variant="secondary" className="text-xs">{connections.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pharmacy" className="gap-2">
            <Pill className="h-4 w-4" />
            {l.pharmacies}
            <Badge variant="secondary" className="text-xs">{countByType('pharmacy')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="laboratory" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            {l.laboratories}
            <Badge variant="secondary" className="text-xs">{countByType('laboratory')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="clinic" className="gap-2">
            <Building2 className="h-4 w-4" />
            {l.clinics}
            <Badge variant="secondary" className="text-xs">{countByType('clinic')}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" className="text-muted-foreground" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">{l.noConnections}</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 me-2" />
                  {l.addConnection}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredConnections.map(conn => (
                <Card key={conn.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conn.connected_provider?.avatar_url} />
                        <AvatarFallback className="bg-primary/10">
                          {getProviderIcon(conn.connected_provider?.professional_type || '')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium truncate">{conn.connected_provider?.business_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {getProviderTypeLabel(conn.connected_provider?.professional_type || '')}
                            </p>
                          </div>
                          {getConnectionTypeBadge(conn.connection_type)}
                        </div>

                        <div className="mt-2 space-y-1 text-sm">
                          {conn.connected_provider?.wilaya && (
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {conn.connected_provider.commune && `${conn.connected_provider.commune}, `}
                              {conn.connected_provider.wilaya}
                            </p>
                          )}
                          {conn.connected_provider?.average_rating > 0 && (
                            <p className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {conn.connected_provider.average_rating.toFixed(1)}
                              <span className="text-muted-foreground">
                                ({conn.connected_provider.total_reviews} {l.reviews})
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedConnection(conn)
                              setShowDetailsDialog(true)
                            }}
                          >
                            {l.viewDetails}
                          </Button>
                          <Button size="sm" variant="ghost">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          {conn.connected_provider?.phone && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={`tel:${conn.connected_provider.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Connection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{l.addConnection}</DialogTitle>
            <DialogDescription>{l.searchProviders}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filter by type */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'pharmacy', 'laboratory', 'clinic'].map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={providerTypeFilter === type ? 'default' : 'outline'}
                  onClick={() => setProviderTypeFilter(type)}
                >
                  {type === 'all' ? l.all : getProviderTypeLabel(type)}
                </Button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={l.searchProviders}
                onChange={(e) => searchProviders(e.target.value)}
                className="ps-9"
              />
            </div>

            {/* Search results */}
            <ScrollArea className="h-[300px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" className="text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {l.noResults}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(provider => {
                    const isSelected = selectedProviderToAdd?.id === provider.id
                    const isAlreadyConnected = connections.some(c => c.connected_to_id === provider.id)

                    return (
                      <div
                        key={provider.id}
                        onClick={() => !isAlreadyConnected && setSelectedProviderToAdd(provider)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isAlreadyConnected 
                            ? 'opacity-50 cursor-not-allowed' 
                            : isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={provider.avatar_url} />
                            <AvatarFallback>
                              {getProviderIcon(provider.professional_type)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{provider.business_name}</p>
                              {isAlreadyConnected && (
                                <Badge variant="secondary" className="text-xs">{l.alreadyConnected}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getProviderTypeLabel(provider.professional_type)} • {provider.wilaya}
                            </p>
                            {provider.average_rating > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {provider.average_rating.toFixed(1)} ({provider.total_reviews})
                              </p>
                            )}
                          </div>
                          {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Connection type and notes (when provider selected) */}
            {selectedProviderToAdd && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>{l.selectType}</Label>
                  <div className="flex gap-2">
                    {(['preferred', 'affiliated', 'contracted'] as const).map(type => (
                      <Button
                        key={type}
                        size="sm"
                        variant={connectionType === type ? 'default' : 'outline'}
                        onClick={() => setConnectionType(type)}
                      >
                        {type === 'preferred' && <Star className="h-3 w-3 me-1" />}
                        {l[type]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{l.notes}</Label>
                  <Textarea
                    value={connectionNotes}
                    onChange={(e) => setConnectionNotes(e.target.value)}
                    placeholder="Optional notes about this connection..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {l.cancel}
            </Button>
            <Button 
              onClick={handleAddConnection} 
              disabled={!selectedProviderToAdd || isSubmitting}
            >
              {isSubmitting && <LoadingSpinner size="sm" className="me-2" />}
              {l.connect}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connection Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedConnection?.connected_provider?.business_name}</DialogTitle>
            <DialogDescription>
              {selectedConnection && getProviderTypeLabel(selectedConnection.connected_provider?.professional_type || '')}
            </DialogDescription>
          </DialogHeader>

          {selectedConnection && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedConnection.connected_provider?.avatar_url} />
                  <AvatarFallback>
                    {getProviderIcon(selectedConnection.connected_provider?.professional_type || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  {getConnectionTypeBadge(selectedConnection.connection_type)}
                  <p className="text-sm text-muted-foreground mt-1">
                    {l.since} {new Date(selectedConnection.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {selectedConnection.connected_provider?.wilaya && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedConnection.connected_provider.commune && `${selectedConnection.connected_provider.commune}, `}
                    {selectedConnection.connected_provider.wilaya}
                  </div>
                )}
                {selectedConnection.connected_provider?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedConnection.connected_provider.phone}`} className="text-primary hover:underline">
                      {selectedConnection.connected_provider.phone}
                    </a>
                  </div>
                )}
                {selectedConnection.connected_provider?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedConnection.connected_provider.email}`} className="text-primary hover:underline">
                      {selectedConnection.connected_provider.email}
                    </a>
                  </div>
                )}
              </div>

              {selectedConnection.notes && (
                <div>
                  <Label className="text-sm">{l.notes}</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1">
                    {selectedConnection.notes}
                  </p>
                </div>
              )}

              {/* Change connection type */}
              <div className="space-y-2">
                <Label className="text-sm">{l.selectType}</Label>
                <div className="flex gap-2">
                  {(['preferred', 'affiliated', 'contracted'] as const).map(type => (
                    <Button
                      key={type}
                      size="sm"
                      variant={selectedConnection.connection_type === type ? 'default' : 'outline'}
                      onClick={() => handleUpdateConnectionType(selectedConnection.id, type)}
                    >
                      {type === 'preferred' && <Star className="h-3 w-3 me-1" />}
                      {l[type]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedConnection) {
                  handleRemoveConnection(selectedConnection.id)
                  setShowDetailsDialog(false)
                }
              }}
            >
              <Unlink className="h-4 w-4 me-2" />
              {l.disconnect}
            </Button>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

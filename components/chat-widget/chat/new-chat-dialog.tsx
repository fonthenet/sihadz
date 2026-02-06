'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, Users, User, Check, Star, MapPin, Building2, Stethoscope, TestTube, Pill, Truck, MessageCircleOff, UserPlus } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/chat/chat-utils'
import type { Profile } from '@/types/chat'
import { createBrowserClient } from '@/lib/supabase/client'
import { usePlatformChatSettings } from '@/hooks/use-platform-chat-settings'

interface NewChatDialogProps {
  isOpen: boolean
  currentUserId: string
  currentUserType?: string // 'patient' | 'doctor' | 'pharmacy' | etc.
  onClose: () => void
  onCreateDirect: (userId: string) => Promise<void>
  onCreateGroup: (title: string, memberIds: string[]) => Promise<void>
  isDark?: boolean
}

interface SearchableProfile extends Profile {
  professional_id?: string
  wilaya?: string
  rating?: number
  is_verified?: boolean
  // Chat availability settings
  accepting_new_chats?: boolean
  accept_from_patients?: boolean
  accept_from_providers?: boolean
  can_message?: boolean // computed: can the current user message this user?
}

export function NewChatDialog({
  isOpen,
  currentUserId,
  currentUserType = 'patient',
  onClose,
  onCreateDirect,
  onCreateGroup,
  isDark = false
}: NewChatDialogProps) {
  const [profiles, setProfiles] = useState<SearchableProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'direct' | 'group'>('direct')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<SearchableProfile[]>([])
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [addingFavorite, setAddingFavorite] = useState<string | null>(null)
  const resolvedIdsRef = useRef<Set<string>>(new Set())

  // Fetch favorites when dialog opens
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        const ids = new Set<string>((data.favorites || []).map((f: { professional_id?: string }) => f.professional_id).filter((x: string | undefined): x is string => Boolean(x)))
        if (!cancelled) setFavoriteIds(ids)
      } catch {
        if (!cancelled) setFavoriteIds(new Set())
      }
    }
    fetchFavorites()
    return () => { cancelled = true }
  }, [isOpen])

  const toggleFavorite = useCallback(async (e: React.MouseEvent, professionalId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (addingFavorite) return
    setAddingFavorite(professionalId)
    try {
      const isFav = favoriteIds.has(professionalId)
      const r = await fetch(
        isFav ? `/api/favorites?professional_id=${professionalId}` : '/api/favorites',
        isFav
          ? { method: 'DELETE', credentials: 'include' }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ professional_id: professionalId }) }
      )
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed')
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (isFav) next.delete(professionalId)
        else next.add(professionalId)
        return next
      })
      toast.success(isFav ? 'Removed from contacts' : 'Added to contacts')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update contacts')
    } finally {
      setAddingFavorite(null)
    }
  }, [favoriteIds, addingFavorite])

  // Check if the current user is a provider (all pro types)
  const proTypes = ['doctor', 'nurse', 'pharmacy', 'laboratory', 'clinic', 'ambulance', 'pharma_supplier', 'equipment_supplier']
  const currentUserIsProvider = proTypes.includes(currentUserType)

  // Platform-wide chat settings (controlled by super admin)
  const { canUserChatWith, loading: platformSettingsLoading } = usePlatformChatSettings()

  const targetIsPro = (t?: string) => t && proTypes.includes(t)

  // Determine if the current user can message a target user based on their settings AND platform settings
  const canMessageUser = useCallback((
    targetSettings: { accepting_new_chats?: boolean; accept_from_patients?: boolean; accept_from_providers?: boolean } | null,
    targetUserType?: string
  ): boolean => {
    // Pro-to-pro: always allow (full chat access for all professionals)
    if (currentUserIsProvider && targetIsPro(targetUserType)) return true

    // First check platform-level settings
    if (targetUserType && !canUserChatWith(currentUserType, targetUserType)) {
      return false
    }

    // Then check individual user settings
    if (!targetSettings) return true // No settings = accept all (default)
    if (targetSettings.accepting_new_chats === false) return false
    if (currentUserIsProvider && targetSettings.accept_from_providers === false) return false
    if (!currentUserIsProvider && targetSettings.accept_from_patients === false) return false
    return true
  }, [currentUserType, currentUserIsProvider, canUserChatWith])

  // Tokenize query for smart search: split on whitespace, trim, filter empty, limit to 4 tokens
  const tokenizeQuery = (q: string): string[] => {
    return q
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 4)
  }

  // Build OR filter for multi-token search (any token matches)
  const buildOrFilter = (columns: string[], tokens: string[]): string => {
    const parts: string[] = []
    for (const col of columns) {
      for (const t of tokens) {
        if (t.length > 0) parts.push(`${col}.ilike.%${t}%`)
      }
    }
    return parts.join(',')
  }

  // Search function: smart search by name, email, and business_name
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setProfiles([])
      return
    }
    setLoading(true)
    
    const supabase = createBrowserClient()
    const merged: SearchableProfile[] = []
    const tokens = tokenizeQuery(query)
    const hasTokens = tokens.length > 0

    try {
      // 1. Search professionals via API (uses service role, bypasses RLS - ensures all pros visible)
      let professionals: { id: string; auth_user_id: string | null; business_name: string; type: string; phone?: string; wilaya?: string; commune?: string; is_verified?: boolean; is_active?: boolean; rating?: number }[] = []
      if (hasTokens) {
        try {
          const res = await fetch(`/api/chat/search-contacts?q=${encodeURIComponent(query.trim())}`, { credentials: 'include' })
          if (res.ok) {
            const json = await res.json()
            professionals = json.professionals || []
          }
        } catch (e) {
          console.warn('[NewChat] API search failed, falling back to client:', e)
          const proOr = buildOrFilter(['business_name', 'email', 'type', 'wilaya'], tokens)
          const { data } = await supabase
            .from('professionals')
            .select('id, auth_user_id, business_name, type, phone, wilaya, commune, is_verified, is_active, rating')
            .or(proOr)
            .in('status', ['verified', 'approved', 'pending', 'waiting_approval'])
            .neq('auth_user_id', currentUserId)
            .limit(20)
          professionals = data || []
        }
      }

      // 2. Search profiles by full_name OR email (smart tokenized)
      let patients: { id: string; full_name: string | null; user_type?: string; avatar_url?: string | null }[] = []
      if (hasTokens) {
        const profileOr = buildOrFilter(['full_name', 'email'], tokens)
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, user_type, avatar_url')
          .or(profileOr)
          .neq('id', currentUserId)
          .limit(15)
        patients = data || []
      }

      // 3. Professionals matched by email (profiles.email -> professionals.auth_user_id)
      if (hasTokens && patients.length > 0) {
        const profileIdsByEmail = patients.map(p => p.id)
        const { data: prosByEmail } = await supabase
          .from('professionals')
          .select('id, auth_user_id, business_name, type, phone, wilaya, commune, is_verified, is_active, rating')
          .in('auth_user_id', profileIdsByEmail)
          .in('status', ['verified', 'approved', 'pending'])
          .neq('auth_user_id', currentUserId)
        if (prosByEmail?.length) {
          const existingIds = new Set(professionals.map(p => p.auth_user_id).filter(Boolean))
          for (const p of prosByEmail) {
            if (p.auth_user_id && !existingIds.has(p.auth_user_id)) {
              professionals.push(p)
              existingIds.add(p.auth_user_id)
            }
          }
        }
      }

      // Collect all user IDs to fetch their chat settings
      const allUserIds: string[] = []
      if (professionals) {
        for (const p of professionals) {
          if (p.auth_user_id) allUserIds.push(p.auth_user_id)
        }
      }
      if (patients) {
        for (const p of patients) {
          if (!allUserIds.includes(p.id)) allUserIds.push(p.id)
        }
      }

      // Fetch chat settings for all users
      let settingsMap = new Map<string, { accepting_new_chats?: boolean; accept_from_patients?: boolean; accept_from_providers?: boolean }>()
      if (allUserIds.length > 0) {
        try {
          const { data: settings } = await supabase
            .from('chat_user_settings')
            .select('user_id, accepting_new_chats, accept_from_patients, accept_from_providers')
            .in('user_id', allUserIds)
          if (settings) {
            for (const s of settings) {
              settingsMap.set(s.user_id, s)
            }
          }
        } catch (e) {
          // Table might not exist, ignore
          console.warn('Could not fetch chat settings:', e)
        }
      }

      // Add professionals
      if (professionals) {
        for (const p of professionals) {
          if (p.auth_user_id) {
            const settings = settingsMap.get(p.auth_user_id) || null
            const canMessage = canMessageUser(settings, p.type)
            merged.push({
              id: p.auth_user_id,
              full_name: p.business_name,
              user_type: p.type as any,
              avatar_url: null,
              is_online: p.is_active || false,
              presence_status: 'offline',
              status_message: null,
              last_seen_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              professional_id: p.id,
              wilaya: p.wilaya,
              rating: p.rating,
              is_verified: p.is_verified,
              accepting_new_chats: settings?.accepting_new_chats,
              accept_from_patients: settings?.accept_from_patients,
              accept_from_providers: settings?.accept_from_providers,
              can_message: canMessage
            })
          }
        }
      }

      // 4. Look up professional_id for patients who have a professionals record
      const patientIds = patients?.map(p => p.id).filter(Boolean) || []
      let profileToProfessionalId = new Map<string, string>()
      if (patientIds.length > 0) {
        const { data: prosForPatients } = await supabase
          .from('professionals')
          .select('id, auth_user_id')
          .in('auth_user_id', patientIds)
          .in('status', ['verified', 'approved', 'pending', 'waiting_approval'])
        if (prosForPatients) {
          for (const pro of prosForPatients) {
            if (pro.auth_user_id) profileToProfessionalId.set(pro.auth_user_id, pro.id)
          }
        }
      }

      // Add patients (avoid duplicates)
      if (patients) {
        for (const p of patients) {
          if (!merged.find(m => m.id === p.id)) {
            const settings = settingsMap.get(p.id) || null
            const userType = p.user_type || 'patient'
            const canMessage = canMessageUser(settings, userType)
            const professionalId = profileToProfessionalId.get(p.id) || undefined
            merged.push({
              id: p.id,
              full_name: p.full_name || 'Unknown',
              user_type: userType as any,
              avatar_url: p.avatar_url ?? null,
              is_online: false,
              presence_status: 'offline',
              status_message: null,
              last_seen_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              professional_id: professionalId,
              accepting_new_chats: settings?.accepting_new_chats,
              accept_from_patients: settings?.accept_from_patients,
              accept_from_providers: settings?.accept_from_providers,
              can_message: canMessage
            })
          }
        }
      }

      setProfiles(merged)
    } catch (err) {
      console.error('Error searching users:', err)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      setProfiles([])
      setSearchQuery('')
      setSelectedUsers([])
      setGroupName('')
      setMode('direct')
      resolvedIdsRef.current = new Set()
    }
  }, [isOpen])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Resolve professional_id for users with pro type but missing it (e.g. from profiles-only search)
  useEffect(() => {
    const needResolve = profiles.filter(
      p => !p.professional_id && p.user_type && proTypes.includes(String(p.user_type)) && !resolvedIdsRef.current.has(p.id)
    )
    if (needResolve.length === 0) return
    needResolve.forEach(p => resolvedIdsRef.current.add(p.id))
    let cancelled = false
    const resolve = async () => {
      const supabase = createBrowserClient()
      const { data: pros } = await supabase
        .from('professionals')
        .select('id, auth_user_id')
        .in('auth_user_id', needResolve.map(p => p.id))
        .in('status', ['verified', 'approved', 'pending', 'waiting_approval'])
      if (cancelled || !pros?.length) return
      const map = new Map(pros.map(p => [p.auth_user_id, p.id]))
      setProfiles(prev =>
        prev.map(p =>
          !p.professional_id && map.has(p.id)
            ? { ...p, professional_id: map.get(p.id) }
            : p
        )
      )
    }
    resolve()
    return () => { cancelled = true }
  }, [profiles])

  const filteredProfiles = profiles.filter(p => p.id !== currentUserId)

  const handleSelectUser = (user: Profile) => {
    if (mode === 'direct') {
      handleCreateDirect(user.id)
    } else {
      setSelectedUsers(prev => {
        const exists = prev.some(u => u.id === user.id)
        if (exists) {
          return prev.filter(u => u.id !== user.id)
        }
        return [...prev, user]
      })
    }
  }

  const handleCreateDirect = async (userId: string) => {
    setCreating(true)
    try {
      await onCreateDirect(userId)
      onClose()
    } finally {
      setCreating(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) return

    setCreating(true)
    try {
      await onCreateGroup(groupName.trim(), selectedUsers.map(u => u.id))
      onClose()
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={cn(
        "relative w-full max-w-md rounded-2xl shadow-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden",
        isDark ? "bg-slate-900 border border-slate-700" : "bg-white"
      )}>
        <div className={cn(
          "flex items-center justify-between p-4 border-b",
          isDark ? "border-slate-700" : "border-slate-100"
        )}>
          <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>New Conversation</h2>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-400"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("p-4 border-b", isDark ? "border-slate-700" : "border-slate-100")}>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setMode('direct')
                setSelectedUsers([])
              }}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                mode === 'direct'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <User className="h-4 w-4" />
              Direct
            </button>
            <button
              onClick={() => setMode('group')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                mode === 'group'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Users className="h-4 w-4" />
              Group
            </button>
          </div>

          {mode === 'group' && (
            <div className="mb-4">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl text-sm transition-all border focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                )}
              />
            </div>
          )}

          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedUsers.map(user => (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border",
                    isDark
                      ? "bg-slate-800/70 text-slate-100 border-slate-700"
                      : "bg-teal-50 text-teal-700 border-teal-100"
                  )}
                >
                  <span>{user.full_name}</span>
                  <button
                    onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
                    className={cn(
                      "transition-colors",
                      isDark ? "text-slate-300 hover:text-white" : "hover:text-teal-900"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all border focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                isDark
                  ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
              )}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="md" className="text-slate-400" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <User className="h-8 w-8 mb-2" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            filteredProfiles.map(user => {
              const isSelected = selectedUsers.some(u => u.id === user.id)
              const canMessage = user.can_message !== false // Default to true if not set
              const userTypeIcon = () => {
                switch(user.user_type) {
                  case 'doctor': return <Stethoscope className="h-3.5 w-3.5" />
                  case 'pharmacy': return <Pill className="h-3.5 w-3.5" />
                  case 'laboratory': return <TestTube className="h-3.5 w-3.5" />
                  case 'clinic': return <Building2 className="h-3.5 w-3.5" />
                  case 'ambulance': return <Truck className="h-3.5 w-3.5" />
                  default: return <User className="h-3.5 w-3.5" />
                }
              }
              const avatarColors = () => {
                switch(user.user_type) {
                  case 'doctor': return 'from-blue-400 to-indigo-500'
                  case 'pharmacy': return 'from-green-400 to-emerald-500'
                  case 'laboratory': return 'from-purple-400 to-violet-500'
                  case 'clinic': return 'from-pink-400 to-rose-500'
                  case 'ambulance': return 'from-red-400 to-orange-500'
                  default: return 'from-teal-400 to-cyan-500'
                }
              }
              const isInContacts = user.professional_id ? favoriteIds.has(user.professional_id) : false
              const isAdding = user.professional_id ? addingFavorite === user.professional_id : false

              return (
                <div
                  key={user.id}
                  className={cn(
                    'w-full p-3 rounded-xl transition-all flex items-center gap-3',
                    isSelected
                      ? (isDark ? 'bg-teal-900/30 border border-teal-800/40' : 'bg-teal-50 border border-teal-100')
                      : canMessage 
                        ? (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')
                        : ''
                  )}
                >
                  <button
                    onClick={() => canMessage && handleSelectUser(user)}
                    disabled={creating || !canMessage}
                    className={cn(
                      'flex-1 min-w-0 flex items-center gap-3 text-left',
                      !canMessage && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                  <div className={cn(
                    'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-medium',
                    avatarColors(),
                    !canMessage && 'grayscale'
                  )}>
                    {getInitials(user.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('font-medium truncate', isDark ? 'text-white' : 'text-slate-900')}>
                        {user.full_name}
                      </p>
                      {user.is_verified && (
                        <span className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                      {!canMessage && (
                        <span className="flex-shrink-0" title="Not accepting messages">
                          <MessageCircleOff className="h-4 w-4 text-slate-400" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-xs flex items-center gap-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                        {userTypeIcon()}
                        <span className="capitalize">{user.user_type}</span>
                      </span>
                      {user.wilaya && (
                        <span className={cn('text-xs flex items-center gap-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
                          <MapPin className="h-3 w-3" />
                          {user.wilaya}
                        </span>
                      )}
                      {user.rating && user.rating > 0 && (
                        <span className="text-xs flex items-center gap-1 text-amber-500">
                          <Star className="h-3 w-3 fill-amber-500" />
                          {user.rating.toFixed(1)}
                        </span>
                      )}
                      {!canMessage && (
                        <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                          Not accepting messages
                        </span>
                      )}
                    </div>
                  </div>
                  {mode === 'group' && isSelected && (
                    <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  </button>
                  {user.professional_id && (
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, user.professional_id!)}
                      disabled={isAdding}
                      title={isInContacts ? 'Remove from contacts' : 'Add to contacts'}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 transition-colors text-sm font-medium',
                        isInContacts
                          ? 'text-amber-500 hover:bg-amber-500/10'
                          : isDark
                            ? 'text-teal-400 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40'
                            : 'text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200'
                      )}
                    >
                      {isAdding ? (
                        <LoadingSpinner size="sm" />
                      ) : isInContacts ? (
                        <>
                          <Star className="h-4 w-4 fill-current" />
                          <span className="hidden sm:inline">Added</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span className="hidden sm:inline">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {mode === 'group' && (
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length < 1 || creating}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25"
            >
              {creating ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  Create Group ({selectedUsers.length} members)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

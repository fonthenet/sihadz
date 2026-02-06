'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Users, User, Check, Star, MapPin, Building2, Stethoscope, TestTube, Pill, Truck, UserPlus } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/chat/chat-utils'
import type { Profile } from '@/types/chat'
import { createBrowserClient } from '@/lib/supabase/client'

interface NewChatDialogProps {
  isOpen: boolean
  currentUserId: string
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
}

export function NewChatDialog({
  isOpen,
  currentUserId,
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

  // Fetch favorites when dialog opens
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        const ids = new Set((data.favorites || []).map((f: { professional_id?: string }) => f.professional_id).filter(Boolean))
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

  // Search function that queries BOTH profiles and professionals
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setProfiles([])
      return
    }
    setLoading(true)
    
    const supabase = createBrowserClient()
    const merged: SearchableProfile[] = []

    try {
      // Search professionals (doctors, pharmacies, labs, clinics, ambulances)
      const { data: professionals } = await supabase
        .from('professionals')
        .select('id, auth_user_id, business_name, type, phone, wilaya, commune, is_verified, is_active, rating')
        .or(`business_name.ilike.%${query}%,type.ilike.%${query}%,wilaya.ilike.%${query}%`)
        .eq('status', 'verified')
        .neq('auth_user_id', currentUserId)
        .limit(15)

      // Search patients/regular users
      const { data: patients } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, avatar_url')
        .ilike('full_name', `%${query}%`)
        .neq('id', currentUserId)
        .limit(10)

      // Add professionals
      if (professionals) {
        for (const p of professionals) {
          if (p.auth_user_id) {
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
              is_verified: p.is_verified
            })
          }
        }
      }

      // Add patients (avoid duplicates)
      if (patients) {
        for (const p of patients) {
          if (!merged.find(m => m.id === p.id)) {
            merged.push({
              id: p.id,
              full_name: p.full_name || 'Unknown',
              user_type: (p.user_type || 'patient') as any,
              avatar_url: p.avatar_url,
              is_online: false,
              presence_status: 'offline',
              status_message: null,
              last_seen_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
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
    }
  }, [isOpen])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
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
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
          )}

          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm"
                >
                  <span>{user.full_name}</span>
                  <button
                    onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
                    className="hover:text-teal-900"
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
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
              const isInContacts = user.professional_id ? favoriteIds.has(user.professional_id) : false
              const isAdding = user.professional_id ? addingFavorite === user.professional_id : false
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
              return (
                <div
                  key={user.id}
                  className={cn(
                    'w-full p-3 rounded-xl transition-all flex items-center gap-3',
                    isSelected
                      ? 'bg-teal-50 border border-teal-100'
                      : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                  )}
                >
                  <button
                    onClick={() => handleSelectUser(user)}
                    disabled={creating}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-medium shrink-0',
                      avatarColors()
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
                        'p-2 rounded-lg shrink-0 transition-colors',
                        isInContacts
                          ? 'text-amber-500 hover:bg-amber-500/10'
                          : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-teal-400' : 'text-slate-500 hover:bg-slate-200 hover:text-teal-600'
                      )}
                    >
                      {isAdding ? (
                        <LoadingSpinner size="sm" />
                      ) : isInContacts ? (
                        <Star className="h-4 w-4 fill-current" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
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
                <LoadingSpinner size="md" />
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

'use client'

import { X, Users, Bell, BellOff, Trash2, LogOut, Image, File, Link } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials, formatRelativeTime } from '@/lib/chat/chat-utils'
import type { ThreadWithDetails } from '../../types/types'

interface ThreadInfoProps {
  thread: ThreadWithDetails | null
  isOpen: boolean
  onClose: () => void
}

export function ThreadInfo({ thread, isOpen, onClose }: ThreadInfoProps) {
  if (!thread || !isOpen) return null

  const displayName = thread.thread_type === 'group'
    ? thread.title || 'Group Chat'
    : thread.other_user?.full_name || 'Unknown User'

  return (
    <div className="w-80 border-l border-slate-100 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Details</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col items-center text-center border-b border-slate-100">
          <div className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4',
            thread.thread_type === 'group'
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              : 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white'
          )}>
            {thread.thread_type === 'group' ? (
              <Users className="h-10 w-10" />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <h4 className="text-lg font-semibold text-slate-900">{displayName}</h4>
          {thread.thread_type === 'direct' && thread.other_user && (
            <p className="text-sm text-slate-500 capitalize mt-1">
              {thread.other_user.user_type}
            </p>
          )}
          {thread.thread_type === 'group' && (
            <p className="text-sm text-slate-500 mt-1">
              {thread.members?.length || 0} members
            </p>
          )}
        </div>

        {thread.thread_type === 'group' && thread.members && (
          <div className="p-4 border-b border-slate-100">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Members
            </h5>
            <div className="space-y-2">
              {thread.members.map(member => (
                <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-medium">
                    {member.profile ? getInitials(member.profile.full_name) : '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {member.profile?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {member.profile?.user_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-b border-slate-100">
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Shared Media
          </h5>
          <div className="grid grid-cols-3 gap-2">
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              <Image className="h-6 w-6" />
            </div>
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              <File className="h-6 w-6" />
            </div>
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              <Link className="h-6 w-6" />
            </div>
          </div>
          <button className="w-full mt-3 py-2 text-sm text-teal-600 hover:text-teal-700 font-medium">
            View all media
          </button>
        </div>

        <div className="p-4">
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Actions
          </h5>
          <div className="space-y-1">
            <button className="w-full p-3 rounded-xl text-left hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors">
              <Bell className="h-5 w-5 text-slate-400" />
              <span className="text-sm">Mute notifications</span>
            </button>
            <button className="w-full p-3 rounded-xl text-left hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors">
              <Trash2 className="h-5 w-5 text-slate-400" />
              <span className="text-sm">Clear chat history</span>
            </button>
            {thread.thread_type === 'group' && (
              <button className="w-full p-3 rounded-xl text-left hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors">
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Leave group</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

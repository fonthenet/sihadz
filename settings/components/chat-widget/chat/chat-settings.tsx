'use client'

// ============================================
// CHAT SETTINGS COMPONENT
// ============================================

import { useState } from 'react'
import { 
  X, Bell, Volume2, Moon, Sun, Monitor, Type,
  Eye, Send, MessageSquare, Keyboard,
  Shield, UserX, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatUserSettings, ThemeMode, FontSize } from '@/types/chat'

interface ChatSettingsProps {
  isOpen: boolean
  onClose: () => void
  settings: ChatUserSettings | null
  onUpdateSettings: (updates: Partial<ChatUserSettings>) => Promise<void>
  blockedUsers?: Array<{ id: string; full_name: string }>
  onUnblockUser?: (userId: string) => Promise<void>
}

export function ChatSettings({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  blockedUsers = [],
  onUnblockUser
}: ChatSettingsProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'blocked'>('main')
  const [saving, setSaving] = useState(false)

  if (!isOpen || !settings) return null

  const handleToggle = async (key: keyof ChatUserSettings, value: boolean) => {
    setSaving(true)
    await onUpdateSettings({ [key]: value })
    setSaving(false)
  }

  const handleSelect = async <K extends keyof ChatUserSettings>(
    key: K, 
    value: ChatUserSettings[K]
  ) => {
    setSaving(true)
    await onUpdateSettings({ [key]: value })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={cn(
        'relative w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden',
        'bg-white dark:bg-slate-900'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {activeSection !== 'main' && (
              <button
                onClick={() => setActiveSection('main')}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {activeSection === 'main' ? 'Chat Settings' : 'Blocked Users'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {activeSection === 'main' ? (
            <div className="p-4 space-y-6">
              {/* Notifications */}
              <SettingsSection title="Notifications" icon={<Bell className="h-4 w-4" />}>
                <SettingToggle
                  label="Enable Notifications"
                  description="Receive in-app notifications"
                  checked={settings.notifications_enabled}
                  onChange={(v) => handleToggle('notifications_enabled', v)}
                />
                <SettingToggle
                  label="Notification Sounds"
                  description="Play sound for new messages"
                  checked={settings.sound_enabled}
                  onChange={(v) => handleToggle('sound_enabled', v)}
                  icon={<Volume2 className="h-4 w-4" />}
                />
              </SettingsSection>

              {/* Appearance */}
              <SettingsSection title="Appearance" icon={<Moon className="h-4 w-4" />}>
                <SettingSelect
                  label="Theme"
                  value={settings.theme}
                  options={[
                    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
                    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
                    { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
                  ]}
                  onChange={(v) => handleSelect('theme', v as ThemeMode)}
                />
                <SettingSelect
                  label="Font Size"
                  value={settings.font_size}
                  options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  onChange={(v) => handleSelect('font_size', v as FontSize)}
                  icon={<Type className="h-4 w-4" />}
                />
                <SettingToggle
                  label="Compact Mode"
                  description="Show more messages"
                  checked={settings.compact_mode}
                  onChange={(v) => handleToggle('compact_mode', v)}
                />
              </SettingsSection>

              {/* Privacy */}
              <SettingsSection title="Privacy" icon={<Shield className="h-4 w-4" />}>
                <SettingToggle
                  label="Read Receipts"
                  description="Let others know when you've read messages"
                  checked={settings.show_read_receipts}
                  onChange={(v) => handleToggle('show_read_receipts', v)}
                  icon={<Eye className="h-4 w-4" />}
                />
                <SettingToggle
                  label="Online Status"
                  description="Show when you're online"
                  checked={settings.show_online_status}
                  onChange={(v) => handleToggle('show_online_status', v)}
                />
                <SettingToggle
                  label="Typing Indicators"
                  description="Show when you're typing"
                  checked={settings.show_typing_indicators}
                  onChange={(v) => handleToggle('show_typing_indicators', v)}
                  icon={<MessageSquare className="h-4 w-4" />}
                />
                <SettingNav
                  label="Blocked Users"
                  description={`${blockedUsers.length} blocked`}
                  icon={<UserX className="h-4 w-4" />}
                  onClick={() => setActiveSection('blocked')}
                />
              </SettingsSection>

              {/* Input */}
              <SettingsSection title="Input" icon={<Keyboard className="h-4 w-4" />}>
                <SettingToggle
                  label="Enter to Send"
                  description="Press Enter to send, Shift+Enter for new line"
                  checked={settings.enter_to_send}
                  onChange={(v) => handleToggle('enter_to_send', v)}
                  icon={<Send className="h-4 w-4" />}
                />
              </SettingsSection>
            </div>
          ) : (
            <div className="p-4">
              {blockedUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No blocked users</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <span className="text-sm font-medium">{user.full_name}</span>
                      <button
                        onClick={() => onUnblockUser?.(user.id)}
                        className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {saving && (
          <div className="absolute bottom-4 right-4">
            <span className="text-xs text-slate-500">Saving...</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SettingToggle({ label, description, checked, onChange, icon, disabled }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode; disabled?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50', disabled && 'opacity-50')}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-slate-400">{icon}</span>}
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <button onClick={() => onChange(!checked)} disabled={disabled}
        className={cn('relative w-11 h-6 rounded-full transition-colors', checked ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600')}>
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

function SettingSelect<T extends string>({ label, value, options, onChange, icon }: {
  label: string; value: T; options: Array<{ value: T; label: string; icon?: React.ReactNode }>; onChange: (v: T) => void; icon?: React.ReactNode
}) {
  return (
    <div className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="flex items-center gap-3 mb-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
      </div>
      <div className="flex gap-2 ml-7">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
              value === opt.value ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300')}>
            {opt.icon}{opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SettingNav({ label, description, icon, onClick }: { label: string; description?: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="flex items-center gap-3">
        {icon && <span className="text-slate-400">{icon}</span>}
        <div className="text-left">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
  )
}

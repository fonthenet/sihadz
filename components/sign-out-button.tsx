'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Red-highlighted Sign Out button. Use across all dashboards (patient, pro, nurse, super-admin). */
const SIGN_OUT_CLASSES =
  'text-destructive bg-destructive/10 hover:bg-destructive/15 focus:text-destructive active:text-destructive'

interface SignOutButtonProps {
  onClick: () => void
  variant?: 'sidebar' | 'icon'
  label?: string
  title?: string
  className?: string
}

export function SignOutButton({
  onClick,
  variant = 'sidebar',
  label = 'Sign Out',
  title,
  className,
}: SignOutButtonProps) {
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(SIGN_OUT_CLASSES, className)}
        aria-label={label}
        title={title ?? label}
      >
        <LogOut className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'flex-1 h-8 rounded-xl justify-center gap-1.5 text-sm font-medium',
        SIGN_OUT_CLASSES,
        className
      )}
      title={title ?? label}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Button>
  )
}

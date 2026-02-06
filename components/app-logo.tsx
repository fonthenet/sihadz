'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AppLogoProps {
  /** Size variant: sm (32px), md (36-40px), lg (44px) */
  size?: 'sm' | 'md' | 'lg'
  /** Optional className for the wrapper */
  className?: string
  /** Use compact square logo (logo.png) vs full logo (siha-dz-logo.png). Default: compact for headers */
  variant?: 'compact' | 'full'
}

/**
 * App logo component - use across the entire website for consistent branding.
 * Replaces the old Stethoscope icon with the actual logo image.
 */
export function AppLogo({ size = 'md', className, variant = 'compact' }: AppLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9 sm:h-10 sm:w-10',
    lg: 'h-11 w-11',
  }

  const pixelSize = size === 'sm' ? 32 : size === 'md' ? 40 : 44

  if (variant === 'full') {
    return (
      <Image
        src="/siha-dz-logo.png"
        alt="Siha DZ"
        width={180}
        height={120}
        className={cn('w-auto object-contain', sizeClasses[size], className)}
        priority
      />
    )
  }

  return (
    <Image
      src="/logo.png?v=4"
      alt="Siha DZ"
      width={pixelSize}
      height={pixelSize}
      className={cn('shrink-0 object-contain', sizeClasses[size], className)}
      priority
    />
  )
}

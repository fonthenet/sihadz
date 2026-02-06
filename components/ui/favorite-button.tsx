'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/lib/i18n/language-context'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  professionalId: string
  initialFavorited?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'button'
  className?: string
  onToggle?: (isFavorited: boolean) => void
}

const labels = {
  en: {
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove from favorites',
    signInRequired: 'Please sign in to save favorites',
    added: 'Added to favorites',
    removed: 'Removed from favorites',
    error: 'Could not update favorites'
  },
  fr: {
    addFavorite: 'Ajouter aux favoris',
    removeFavorite: 'Retirer des favoris',
    signInRequired: 'Connectez-vous pour enregistrer vos favoris',
    added: 'Ajouté aux favoris',
    removed: 'Retiré des favoris',
    error: 'Impossible de mettre à jour les favoris'
  },
  ar: {
    addFavorite: 'إضافة للمفضلة',
    removeFavorite: 'إزالة من المفضلة',
    signInRequired: 'سجل دخولك لحفظ المفضلة',
    added: 'تمت الإضافة للمفضلة',
    removed: 'تمت الإزالة من المفضلة',
    error: 'تعذر تحديث المفضلة'
  }
}

export function FavoriteButton({
  professionalId,
  initialFavorited = false,
  size = 'md',
  variant = 'icon',
  className,
  onToggle
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { language } = useLanguage()
  const lang = (language === 'en' || language === 'fr' || language === 'ar' ? language : 'en') as 'en' | 'fr' | 'ar'
  const t = labels[lang]

  // Sync with initial value
  useEffect(() => {
    setIsFavorited(initialFavorited)
  }, [initialFavorited])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsLoading(true)
    
    try {
      if (isFavorited) {
        // Remove favorite
        const res = await fetch(`/api/favorites?professional_id=${professionalId}`, {
          method: 'DELETE',
          credentials: 'include',
          cache: 'no-store'
        })
        const data = await res.json()
        
        if (!res.ok) {
          if (res.status === 401) {
            toast({ title: t.signInRequired, variant: 'destructive' })
            return
          }
          throw new Error(data.error)
        }
        
        setIsFavorited(false)
        onToggle?.(false)
        toast({ title: t.removed })
      } else {
        // Add favorite
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ professional_id: professionalId }),
          credentials: 'include',
          cache: 'no-store'
        })
        const data = await res.json()
        
        if (!res.ok) {
          if (res.status === 401) {
            toast({ title: t.signInRequired, variant: 'destructive' })
            return
          }
          throw new Error(data.error)
        }
        
        setIsFavorited(true)
        onToggle?.(true)
        toast({ title: t.added })
      }
    } catch (error) {
      console.error('Favorite toggle error:', error)
      toast({ title: t.error, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          sizeClasses[size],
          'rounded-full transition-all duration-200',
          isFavorited 
            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:bg-amber-500/20 dark:text-amber-400' 
            : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-50/50',
          isLoading && 'opacity-50 cursor-wait',
          className
        )}
        title={isFavorited ? t.removeFavorite : t.addFavorite}
      >
        <Star 
          className={cn(
            iconSizes[size],
            'transition-all duration-200',
            isFavorited && 'fill-amber-500 text-amber-500 scale-110'
          )} 
        />
      </Button>
    )
  }

  // Button variant with text
  return (
    <Button
      variant={isFavorited ? 'secondary' : 'outline'}
      size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'default'}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'gap-2 transition-all duration-200',
        isFavorited && 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
        isLoading && 'opacity-50 cursor-wait',
        className
      )}
    >
      <Star 
        className={cn(
          iconSizes[size],
          'transition-all duration-200',
          isFavorited && 'fill-amber-500 text-amber-500'
        )} 
      />
      {isFavorited ? t.removeFavorite : t.addFavorite}
    </Button>
  )
}

/**
 * Hook to manage favorites state for a list of providers
 */
export function useFavorites(providerType?: string) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const url = providerType 
          ? `/api/favorites?type=${providerType}&ids_only=true`
          : '/api/favorites?ids_only=true'
        
        const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setFavoriteIds(new Set(data.ids || []))
        }
      } catch (error) {
        console.error('Fetch favorites error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [providerType])

  const isFavorite = (professionalId: string) => favoriteIds.has(professionalId)
  
  const toggleFavorite = (professionalId: string, newState: boolean) => {
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (newState) {
        next.add(professionalId)
      } else {
        next.delete(professionalId)
      }
      return next
    })
  }

  return {
    favoriteIds,
    isLoading,
    isFavorite,
    toggleFavorite
  }
}

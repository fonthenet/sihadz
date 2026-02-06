import { LoadingSpinner } from '@/components/ui/page-loading'
import { cn } from '@/lib/utils'

function Spinner({ className }: { className?: string }) {
  return <LoadingSpinner size="sm" className={cn(className)} />
}

export { Spinner }

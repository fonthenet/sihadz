import { cn } from '@/lib/utils'
import { LoadingSpinner } from './page-loading'

function Spinner({ className }: { className?: string }) {
  return <LoadingSpinner size="sm" className={cn(className)} />
}

export { Spinner }

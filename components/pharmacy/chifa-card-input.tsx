'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useScanHandler } from '@/lib/scanner'
import { parseChifaCardOutput, type ParsedChifaCard } from '@/lib/pharmacy/chifa-card-parser'
import { CreditCard } from 'lucide-react'

const CHIFA_MIN_LENGTH = 10

export interface ChifaCardInputProps {
  /** Current value (insured number) */
  value: string
  /** Called when value changes (manual or from card read) */
  onChange: (value: string) => void
  /** Called when card is read with full parsed data */
  onChifaRead?: (data: ParsedChifaCard) => void
  /** Optional: pre-filled rank from card */
  insuredRank?: number
  /** Optional: pre-filled name from card */
  insuredName?: string | null
  label?: string
  placeholder?: string
  id?: string
  className?: string
  /** When true, show "ready for card" hint */
  showHint?: boolean
  /** Auto-focus when mounted (e.g. in payment dialog for Chifa sales) */
  autoFocus?: boolean
}

/**
 * Input for Chifa/CNAS card reader (keyboard-wedge mode).
 * When focused, the card reader "types" the card data + Enter, and we parse it.
 * Also supports manual entry.
 */
export function ChifaCardInput({
  value,
  onChange,
  onChifaRead,
  label,
  placeholder = 'Swipe or insert Chifa card...',
  id = 'chifa-card',
  className,
  showHint = true,
  autoFocus = false,
}: ChifaCardInputProps) {
  const { onKeyDown } = useScanHandler({
    context: 'chifa',
    value,
    onScan: (raw, e) => {
      const parsed = parseChifaCardOutput(raw)
      if (parsed) {
        onChange(parsed.insured_number)
        onChifaRead?.(parsed)
        e?.preventDefault?.()
      } else {
        // Raw might be just the number
        const digits = raw.replace(/\D/g, '')
        if (digits.length >= CHIFA_MIN_LENGTH) {
          onChange(digits)
          onChifaRead?.({
            insured_number: digits,
            insured_rank: 1,
            insurance_type: null,
            insured_name: null,
            raw,
          })
        }
      }
    },
    existingOnKeyDown: (e) => {
      if (e.key === 'Enter' && value.trim().length >= CHIFA_MIN_LENGTH) {
        // Manual submit - treat as valid
        const parsed = parseChifaCardOutput(value) || {
          insured_number: value.replace(/\D/g, ''),
          insured_rank: 1,
          insurance_type: null,
          insured_name: null,
          raw: value,
        }
        if (parsed.insured_number.length >= CHIFA_MIN_LENGTH) {
          onChifaRead?.(parsed)
        }
      }
    },
  })

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {label && (
          <Label htmlFor={id} className="text-sm font-medium flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            {label}
          </Label>
        )}
        {value && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
            Read
          </Badge>
        )}
      </div>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 15))}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={15}
        dir="ltr"
        className="font-mono"
        autoFocus={autoFocus}
      />
      {showHint && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Insert Chifa card in reader — data will auto-fill when read
        </p>
      )}
    </div>
  )
}

"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

export function PhoneInput({ value = '', onChange, className, ...props }: PhoneInputProps) {
  const [displayValue, setDisplayValue] = React.useState(value)

  // Format phone number to Algerian format
  const formatPhoneNumber = (input: string): string => {
    let digits = input.replace(/\D/g, '')
    
    // Convert +213 to 0
    if (digits.startsWith('213')) {
      digits = '0' + digits.substring(3)
    }
    
    if (digits.length > 0 && !digits.startsWith('0')) {
      digits = '0' + digits
    }
    
    // Mobile (05/06/07): 10 digits. Landline (02/03/04): 9 digits
    if (digits.startsWith('05') || digits.startsWith('06') || digits.startsWith('07')) {
      digits = digits.substring(0, 10)
    } else if (digits.startsWith('02') || digits.startsWith('03') || digits.startsWith('04')) {
      digits = digits.substring(0, 9)
    } else {
      digits = digits.substring(0, 10)
    }
    
    return digits
  }

  // Validate phone number (Algerian format)
  const isValidPhone = (phone: string): boolean => {
    // Mobile: 05, 06, 07 + 8 digits (10 total). Landline: 02, 03, 04 + 7 digits (10 total)
    const mobileRegex = /^0[5-7]\d{8}$/
    const landlineRegex = /^0[2-4]\d{8}$/
    return mobileRegex.test(phone) || landlineRegex.test(phone)
  }

  React.useEffect(() => {
    setDisplayValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const formatted = formatPhoneNumber(input)
    
    setDisplayValue(formatted)
    onChange?.(formatted)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const phone = e.target.value
    if (phone && !isValidPhone(phone)) {
      console.log('[v0] Invalid phone number format:', phone)
    }
    props.onBlur?.(e)
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0554128522"
        className={cn(
          className,
          displayValue && !isValidPhone(displayValue) && displayValue.length >= 10
            ? "border-destructive focus-visible:ring-destructive"
            : ""
        )}
        dir="ltr"
      />
      {displayValue && !isValidPhone(displayValue) && displayValue.length >= 9 && (
        <p className="text-xs text-destructive mt-1">
          Use Algerian format: 05X XX XX XX XX (mobile) or 0XX XX XX XX (landline)
        </p>
      )}
    </div>
  )
}

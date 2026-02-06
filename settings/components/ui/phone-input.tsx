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

  // Format phone number to Algerian format (0XXXXXXXXX)
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    let digits = input.replace(/\D/g, '')
    
    // Convert +213 format to 0 format
    if (digits.startsWith('213')) {
      digits = '0' + digits.substring(3)
    }
    
    // Ensure it starts with 0
    if (digits.length > 0 && !digits.startsWith('0')) {
      digits = '0' + digits
    }
    
    // Limit to 10 digits (0 + 9 digits)
    digits = digits.substring(0, 10)
    
    return digits
  }

  // Validate phone number
  const isValidPhone = (phone: string): boolean => {
    // Valid Algerian phone: starts with 0, followed by 5,6,7 and 8 more digits
    const regex = /^0[5-7]\d{8}$/
    return regex.test(phone)
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
      {displayValue && !isValidPhone(displayValue) && displayValue.length >= 10 && (
        <p className="text-xs text-destructive mt-1">
          Phone must start with 05, 06, or 07 and be 10 digits
        </p>
      )}
    </div>
  )
}

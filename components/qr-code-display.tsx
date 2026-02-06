'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QRCodeDisplayProps {
  value: string
  size?: number
  showDownload?: boolean
  downloadFileName?: string
  className?: string
}

export function QRCodeDisplay({ 
  value, 
  size = 200, 
  showDownload = true,
  downloadFileName = 'qr-code',
  className = '' 
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      // Also generate data URL for download
      QRCode.toDataURL(value, {
        width: size,
        margin: 2
      }).then(url => {
        setDataUrl(url)
      })
    }
  }, [value, size])

  const handleDownload = () => {
    if (dataUrl) {
      const link = document.createElement('a')
      link.download = `${downloadFileName}.png`
      link.href = dataUrl
      link.click()
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <canvas ref={canvasRef} className="rounded-lg border border-border shrink-0" />
      {showDownload && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDownload}
          className="gap-1.5 h-8 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      )}
    </div>
  )
}

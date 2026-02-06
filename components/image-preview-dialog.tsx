'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt?: string
}

/**
 * Mobile-friendly image preview dialog.
 * Document fills the content area (same size as container except header + X).
 */
export function ImagePreviewDialog({ open, onOpenChange, src, alt = 'Preview' }: ImagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-[100vw] w-full max-h-[100dvh] sm:max-w-[95vw] sm:max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={false}
        resizable={false}
        style={{
          minWidth: 0,
          minHeight: 0,
          width: '100%',
          maxWidth: '100vw',
          height: 'auto',
          maxHeight: '100dvh',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-muted hover:bg-muted/80 ms-auto"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-black">
          {src && (
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

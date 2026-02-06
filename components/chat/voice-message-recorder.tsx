'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, Send, X, Pause, Play, Trash2, MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface VoiceMessageRecorderProps {
  onSend: (blob: Blob, duration: number) => Promise<void>
  onCancel: () => void
  isRecording: boolean
  onStartRecording: () => void
  disabled?: boolean
  className?: string
}

const NUM_BARS = 32

export function VoiceMessageRecorder({
  onSend,
  onCancel,
  isRecording,
  onStartRecording,
  disabled = false,
  className,
}: VoiceMessageRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(NUM_BARS).fill(0))
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasStartedRef = useRef(false)
  const hasFailedRef = useRef(false)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Analyze audio and update levels
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    // Sample data at intervals to get NUM_BARS values
    const step = Math.floor(dataArray.length / NUM_BARS)
    const levels: number[] = []
    
    for (let i = 0; i < NUM_BARS; i++) {
      // Get average of a range for smoother visualization
      let sum = 0
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0
      }
      // Normalize to 0-1 range with some smoothing
      const normalized = (sum / step) / 255
      // Apply some curve for better visual effect
      levels.push(Math.pow(normalized, 0.8))
    }
    
    setAudioLevels(levels)
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    if (hasStartedRef.current || hasFailedRef.current) return
    hasStartedRef.current = true
    setIsStarting(true)
    setError(null)
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      streamRef.current = stream

      // Set up Web Audio API for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      analyserRef.current = analyser

      // Determine best audio format
      // iOS Safari does NOT support WebM - must use audio/mp4 for mobile playback
      const isSafariOrIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'))
      
      let mimeType = ''
      if (isSafariOrIOS) {
        // Prefer MP4 on Safari/iOS - WebM is not supported for playback
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      }
      if (!mimeType) {
        mimeType = 'audio/webm;codecs=opus'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4'
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = '' // Let browser choose
            }
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        
        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e)
        setError('Recording failed. Please try again.')
        cancelRecording()
      }

      mediaRecorder.start(100) // Collect data every 100ms
      onStartRecording()
      
      // Start visualization
      analyzeAudio()
      
      // Start timer
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      setIsStarting(false)
    } catch (err: any) {
      console.error('Failed to start recording:', err)
      hasStartedRef.current = false
      hasFailedRef.current = true
      setIsStarting(false)
      
      const msg = err?.message?.toLowerCase() || ''
      const name = err?.name || ''
      let errorMessage: string
      
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('permission')) {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings to record voice messages.'
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || msg.includes('device not found') || msg.includes('requested device')) {
        errorMessage = 'No microphone detected. Connect a microphone, check that it\'s not in use by another app, or try a different browser.'
      } else if (name === 'NotReadableError' || msg.includes('in use') || msg.includes('could not start')) {
        errorMessage = 'Microphone is in use by another application. Close other apps using the microphone and try again.'
      } else if (name === 'OverconstrainedError' || msg.includes('constraint')) {
        errorMessage = 'Your microphone doesn\'t support the required settings. Try a different microphone or browser.'
      } else {
        errorMessage = 'Could not access microphone. Check that a microphone is connected and allowed for this site.'
      }
      
      setError(errorMessage)
      
      toast.error('Microphone unavailable', {
        description: errorMessage,
        duration: 5000,
      })
    }
  }, [onStartRecording, analyzeAudio])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // Cancel recording
  const cancelRecording = useCallback(() => {
    stopRecording()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
    }
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setRecordingTime(0)
    setAudioLevels(Array(NUM_BARS).fill(0))
    hasStartedRef.current = false
    hasFailedRef.current = false
    onCancel()
  }, [stopRecording, audioUrl, onCancel])

  // Send voice message - parent handles close via finally block
  const sendVoiceMessage = useCallback(async () => {
    if (!audioBlob) return
    
    setIsSending(true)
    try {
      await onSend(audioBlob, recordingTime)
      // Success: cleanup
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioBlob(null)
      setAudioUrl(null)
      setRecordingTime(0)
      hasStartedRef.current = false
    } catch (err) {
      // Parent's finally block will close the recorder
      // Just log the error - toast is shown by context
      console.error('Failed to send voice message:', err)
    } finally {
      setIsSending(false)
    }
  }, [audioBlob, audioUrl, recordingTime, onSend])

  // Play/pause preview
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, audioUrl])

  // No auto-start: user must explicitly click "Start recording" to begin

  // Reset refs when isRecording becomes false (parent closed us)
  useEffect(() => {
    if (!isRecording) {
      hasStartedRef.current = false
      hasFailedRef.current = false
    }
  }, [isRecording])

  // Cleanup on unmount - reset all refs so remount doesn't auto-start
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      // Reset refs so next mount doesn't think it already started
      hasStartedRef.current = false
      hasFailedRef.current = false
    }
  }, [audioUrl])

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const handleEnded = () => setIsPlaying(false)
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [audioUrl])

  // Error state - clear notification, no retries
  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          'flex flex-col gap-3 px-4 py-3 rounded-2xl',
          'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <MicOff className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Microphone unavailable</span>
        </div>
        <span className="text-sm opacity-90">{error}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null)
            hasStartedRef.current = false
            hasFailedRef.current = false
            onCancel()
          }}
          className="w-full border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/30"
        >
          OK, close
        </Button>
      </motion.div>
    )
  }

  // Idle state: user must click "Start" to begin recording (no auto-start)
  if (isRecording && !audioBlob && !hasStartedRef.current && !isStarting && !error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col gap-3 px-4 py-3 rounded-2xl',
          'bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-800',
          className
        )}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">Tap to start recording</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => startRecording()}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Start recording
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </motion.div>
    )
  }

  // Starting state
  if (isStarting) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center justify-center gap-3 px-4 py-4 rounded-2xl',
          'bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-800',
          className
        )}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full"
        />
        <span className="text-sm text-red-600 dark:text-red-400">Starting microphone...</span>
      </motion.div>
    )
  }

  // Recording state - show real waveform
  if (isRecording && !audioBlob) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl',
          'bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-800',
          className
        )}
      >
        {/* Cancel button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Real-time waveform visualization */}
        <div className="flex-1 flex items-center justify-center gap-[2px] h-10">
          {audioLevels.map((level, i) => {
            // Calculate height based on audio level (min 3px, max 32px)
            const height = Math.max(3, Math.min(32, level * 32 + 3))
            
            return (
              <motion.div
                key={i}
                className="w-[3px] bg-gradient-to-t from-red-500 to-orange-400 rounded-full"
                animate={{ height }}
                transition={{ 
                  type: 'spring',
                  stiffness: 400,
                  damping: 20
                }}
              />
            )
          })}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-mono font-medium min-w-[60px]">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-2.5 w-2.5 rounded-full bg-red-500"
          />
          {formatTime(recordingTime)}
        </div>

        {/* Stop button */}
        <Button
          variant="default"
          size="icon"
          onClick={stopRecording}
          className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </motion.div>
    )
  }

  // Preview state - show playback controls with waveform
  if (audioBlob && audioUrl) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl',
          'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-200 dark:border-teal-800',
          className
        )}
      >
        <audio ref={audioRef} src={audioUrl} />
        
        {/* Cancel button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          disabled={isSending}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Play/Pause button */}
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayback}
          disabled={isSending}
          className="h-10 w-10 rounded-full border-teal-300 dark:border-teal-700"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        {/* Static waveform preview - generated from recording data */}
        <div className="flex-1 flex items-center justify-center gap-[2px] h-10">
          {Array.from({ length: 40 }).map((_, i) => {
            // Create a waveform pattern based on index for visual variety
            const angle = (i / 40) * Math.PI * 4
            const height = 6 + Math.abs(Math.sin(angle)) * 18 + Math.abs(Math.sin(angle * 2.5)) * 8
            
            return (
              <div
                key={i}
                className="w-[2px] bg-gradient-to-t from-teal-500 to-cyan-400 rounded-full transition-colors"
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>

        {/* Duration */}
        <span className="text-sm font-mono text-muted-foreground min-w-[50px]">
          {formatTime(recordingTime)}
        </span>

        {/* Send button */}
        <Button
          variant="default"
          size="icon"
          onClick={sendVoiceMessage}
          disabled={isSending}
          className="h-10 w-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/30"
        >
          {isSending ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </motion.div>
    )
  }

  // This shouldn't normally be reached when used properly
  return null
}

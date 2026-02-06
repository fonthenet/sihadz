'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceMessagePlayerProps {
  src: string
  duration?: number
  isOwn?: boolean
  className?: string
}

const NUM_BARS = 40

// Static waveform for when not playing (consistent bar heights)
function getStaticHeights(): number[] {
  return Array.from({ length: NUM_BARS }, (_, i) => {
    const t = i / NUM_BARS
    const curve = 1 - Math.abs(t - 0.5) * 0.4
    return Math.max(0.15, (0.4 + Math.sin(i * 0.5) * 0.3) * curve)
  })
}

export function VoiceMessagePlayer({
  src,
  duration: initialDuration,
  isOwn = false,
  className,
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [isLoading, setIsLoading] = useState(false) // Show play button immediately; load on tap
  const [error, setError] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [audioLevels, setAudioLevels] = useState<number[]>(() => getStaticHeights())

  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const isPlayingRef = useRef(false)
  isPlayingRef.current = isPlaying

  const progress = duration > 0 ? currentTime / duration : 0

  const formatTime = (secs: number) => {
    if (!secs || !isFinite(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      // Set up Web Audio API for real waveform (must be in user gesture, before play)
      if (!sourceRef.current) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const source = ctx.createMediaElementSource(audio)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          analyser.smoothingTimeConstant = 0.5
          source.connect(analyser)
          analyser.connect(ctx.destination)
          audioContextRef.current = ctx
          analyserRef.current = analyser
          sourceRef.current = source
        } catch {
          // Fallback: no analyser, audio plays normally
        }
      }
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      try {
        await audio.play()
        setIsPlaying(true)
      } catch {
        setError(true)
      }
    }
  }, [isPlaying])

  const cycleSpeed = useCallback(() => {
    const speeds = [1, 1.5, 2]
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length]
    setPlaybackRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [playbackRate])

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const container = waveformContainerRef.current
    if (!audio || !container || duration <= 0) return
    
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    audio.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }, [duration])

  // Single RAF loop for smooth timer + waveform (runs continuously, no restart on play/pause)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  useEffect(() => {
    const animate = () => {
      const a = audioRef.current
      const playing = isPlayingRef.current

      if (playing && a) {
        // Always sync timer when playing (even during buffering before playback starts)
        setCurrentTime(a.currentTime)
        const d = a.duration
        if (d && isFinite(d) && d > 0) setDuration(d)

        // Waveform only when actually playing (not paused/buffering)
        if (!a.paused) {
          const anal = analyserRef.current
          if (anal) {
            if (!dataArrayRef.current || dataArrayRef.current.length !== anal.frequencyBinCount) {
              dataArrayRef.current = new Uint8Array(anal.frequencyBinCount)
            }
            const dataArray = dataArrayRef.current
            anal.getByteFrequencyData(dataArray)
            const step = Math.floor(dataArray.length / NUM_BARS) || 1
            const levels: number[] = []
            for (let i = 0; i < NUM_BARS; i++) {
              let sum = 0
              for (let j = 0; j < step; j++) sum += dataArray[i * step + j] || 0
              const n = Math.pow((sum / step) / 255, 0.65)
              levels.push(Math.max(0.2, n * 0.95 + 0.2))
            }
            setAudioLevels(levels)
          } else {
            setAudioLevels(getStaticHeights())
          }
        } else {
          setAudioLevels(getStaticHeights())
        }
      } else {
        setAudioLevels(getStaticHeights())
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, []) // Empty deps: run once, use refs for live values

  // Cleanup Web Audio on unmount
  useEffect(() => {
    return () => {
      try {
        sourceRef.current?.disconnect()
        analyserRef.current?.disconnect()
        audioContextRef.current?.close()
      } catch {}
      sourceRef.current = null
      analyserRef.current = null
      audioContextRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      const d = audio.duration
      if (d && isFinite(d) && d > 0) setDuration(d)
    }
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      const d = audio.duration
      if (d && isFinite(d) && d > 0) setDuration(d)
    }
    const onPlaying = () => {
      setCurrentTime(audio.currentTime)
      const d = audio.duration
      if (d && isFinite(d) && d > 0) setDuration(d)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onCanPlay = () => setIsLoading(false)
    const onDurationChange = () => {
      const d = audio.duration
      if (d && isFinite(d) && d > 0) setDuration(d)
    }
    const onError = () => { setError(true); setIsLoading(false) }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, [src])

  if (error) {
    const isSafariOrIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'))
    )
    return (
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[220px]',
        isOwn ? 'bg-red-500/20' : 'bg-red-100 dark:bg-red-900/30',
        'text-red-600 dark:text-red-400 text-sm',
        className
      )}>
        {isSafariOrIOS ? (
          <>Format not supported on this device. Open on a computer to listen.</>
        ) : (
          <>Audio unavailable</>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[260px] max-w-[320px] overflow-hidden',
        isOwn
          ? 'bg-gradient-to-br from-teal-500 via-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
          : 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 text-foreground shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50',
        className
      )}
    >
      <audio ref={audioRef} src={src} preload="auto" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          'relative h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          isOwn
            ? 'bg-white/25 hover:bg-white/35 text-white focus:ring-white/50 focus:ring-offset-teal-500'
            : 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 focus:ring-teal-500/50 focus:ring-offset-white dark:focus:ring-offset-slate-900'
        )}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"
            />
          ) : isPlaying ? (
            <motion.div
              key="pause"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <Pause className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <Play className="h-5 w-5 ml-0.5" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pulse ring when playing */}
        {isPlaying && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full',
              isOwn ? 'bg-white/20' : 'bg-teal-500/20'
            )}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </button>

      {/* Waveform & progress */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div
          ref={waveformContainerRef}
          onClick={seekTo}
          className="relative flex items-center gap-[2px] h-8 cursor-pointer group"
        >
          {audioLevels.map((height, i) => {
            const barProgress = i / NUM_BARS
            const isActive = barProgress <= progress
            const baseHeight = height * 28 + 4

            return (
              <div
                key={i}
                className={cn(
                  'w-[3px] rounded-full transition-all duration-75',
                  isActive
                    ? isOwn ? 'bg-white' : 'bg-teal-500 dark:bg-teal-400'
                    : isOwn ? 'bg-white/35' : 'bg-slate-300 dark:bg-slate-600',
                  'group-hover:scale-y-110'
                )}
                style={{ height: baseHeight }}
              />
            )
          })}
          {/* Playhead: moves left-to-right in sync with timer (60fps via RAF) */}
          <div
            className={cn(
              'absolute top-0 bottom-0 w-1 rounded-full pointer-events-none z-10 will-change-[left]',
              isOwn ? 'bg-white ring-1 ring-white/50' : 'bg-teal-500 dark:bg-teal-400 ring-1 ring-teal-500/50'
            )}
            style={{
              left: `${Math.min(100, Math.max(0, progress * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          />
        </div>

        {/* Time & speed */}
        <div className={cn(
          'flex items-center justify-between text-[11px] font-mono',
          isOwn ? 'text-white/70' : 'text-muted-foreground'
        )}>
          <span>{formatTime(currentTime)}</span>
          <button
            onClick={cycleSpeed}
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
              isOwn
                ? 'bg-white/15 hover:bg-white/25'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {playbackRate}x
          </button>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Tests for chat-utils - OPTIONAL (delete __tests__ to remove)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getInitials,
  truncate,
  escapeRegExp,
  formatFileSize,
  getFileIcon,
  getFileExtension,
  isImageFile,
  isVideoFile,
  isAudioFile,
  extractUrls,
  extractMentions,
  isMessageEditable,
  isMessageDeletable,
  groupMessagesByDate,
  getThemeColors,
  getFontSizeClass,
  generateTempId,
  highlightMatches,
} from '@/lib/chat/chat-utils'

describe('getInitials', () => {
  it('returns ?? for empty', () => {
    expect(getInitials('')).toBe('??')
  })

  it('returns first letters of first two words', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('Ahmed Benali')).toBe('AB')
  })

  it('handles single name', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  it('uppercases and limits to 2', () => {
    expect(getInitials('john doe smith')).toBe('JD')
  })
})

describe('truncate', () => {
  it('returns full string if within limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })
})

describe('escapeRegExp', () => {
  it('escapes special regex chars', () => {
    expect(escapeRegExp('a.b')).toBe('a\\.b')
    expect(escapeRegExp('(test)')).toBe('\\(test\\)')
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats KB', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('returns 0 B for null or 0', () => {
    expect(formatFileSize(null)).toBe('0 B')
    expect(formatFileSize(0)).toBe('0 B')
  })
})

describe('getFileIcon', () => {
  it('returns icons by mime type', () => {
    expect(getFileIcon('image/png')).toBe('🖼️')
    expect(getFileIcon('video/mp4')).toBe('🎬')
    expect(getFileIcon('audio/mpeg')).toBe('🎵')
    expect(getFileIcon('application/pdf')).toBe('📄')
  })

  it('returns default for unknown', () => {
    expect(getFileIcon('application/octet-stream')).toBe('📎')
  })
})

describe('getFileExtension', () => {
  it('extracts extension', () => {
    expect(getFileExtension('file.pdf')).toBe('pdf')
    expect(getFileExtension('doc.docx')).toBe('docx')
  })

  it('returns empty for no extension', () => {
    expect(getFileExtension('noext')).toBe('')
  })
})

describe('isImageFile, isVideoFile, isAudioFile', () => {
  it('detects by mime prefix', () => {
    expect(isImageFile('image/png')).toBe(true)
    expect(isImageFile('image/jpeg')).toBe(true)
    expect(isImageFile('video/mp4')).toBe(false)

    expect(isVideoFile('video/mp4')).toBe(true)
    expect(isAudioFile('audio/mpeg')).toBe(true)
  })
})

describe('extractUrls', () => {
  it('extracts http URLs', () => {
    expect(extractUrls('Check https://example.com')).toEqual(['https://example.com'])
  })

  it('returns empty for no URLs', () => {
    expect(extractUrls('no url here')).toEqual([])
  })
})

describe('extractMentions', () => {
  it('extracts @mentions', () => {
    expect(extractMentions('Hello @john and @jane')).toEqual(['john', 'jane'])
  })

  it('returns empty for no mentions', () => {
    expect(extractMentions('no mentions')).toEqual([])
  })
})

describe('isMessageEditable / isMessageDeletable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows edit within 15 min', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    vi.setSystemTime(new Date())
    expect(isMessageEditable(tenMinAgo, 15)).toBe(true)
  })

  it('disallows edit after 15 min', () => {
    const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    vi.setSystemTime(new Date())
    expect(isMessageEditable(twentyMinAgo, 15)).toBe(false)
  })
})

describe('groupMessagesByDate', () => {
  it('groups messages by date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-02-02T12:00:00Z'))

    const messages = [
      { id: '1', created_at: '2025-02-02T10:00:00Z' },
      { id: '2', created_at: '2025-02-02T11:00:00Z' },
      { id: '3', created_at: '2025-02-01T10:00:00Z' },
    ]
    const groups = groupMessagesByDate(messages)
    expect(groups.length).toBeGreaterThanOrEqual(1)
    expect(groups[0].messages.length).toBeGreaterThanOrEqual(1)

    vi.useRealTimers()
  })
})

describe('getThemeColors', () => {
  it('returns dark colors for dark theme', () => {
    const c = getThemeColors('dark', 'light')
    expect(c.bg).toBe('bg-slate-900')
    expect(c.text).toBe('text-white')
  })

  it('returns light colors for light theme', () => {
    const c = getThemeColors('light', 'dark')
    expect(c.bg).toBe('bg-white')
  })

  it('uses system theme when theme is system', () => {
    const c = getThemeColors('system', 'dark')
    expect(c.bg).toBe('bg-slate-900')
  })
})

describe('getFontSizeClass', () => {
  it('returns Tailwind classes', () => {
    expect(getFontSizeClass('small')).toBe('text-xs')
    expect(getFontSizeClass('large')).toBe('text-base')
    expect(getFontSizeClass('medium')).toBe('text-sm')
  })
})

describe('generateTempId', () => {
  it('returns temp- prefix with timestamp and random', () => {
    const id = generateTempId()
    expect(id.startsWith('temp-')).toBe(true)
    expect(id).toMatch(/^temp-\d+-[a-z0-9]+$/)
  })
})

describe('highlightMatches', () => {
  it('wraps matches in mark tags', () => {
    expect(highlightMatches('hello world', 'world')).toBe('hello <mark>world</mark>')
  })

  it('returns original when query empty', () => {
    expect(highlightMatches('hello', '')).toBe('hello')
  })
})

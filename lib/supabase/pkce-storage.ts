/**
 * Cookie + sessionStorage hybrid for PKCE code verifier reliability.
 * The PKCE code verifier must persist across the OAuth redirect. Cookies can fail
 * in some browsers (e.g. after logout, in-app browsers). sessionStorage is more
 * reliable for same-tab redirects. We mirror the code-verifier to both.
 */
import * as cookie from 'cookie'

const BASE64_PREFIX = 'base64-'

// Chunk helpers (from @supabase/ssr)
const MAX_CHUNK_SIZE = 3180
const CHUNK_LIKE_REGEX = /^(.*)[.](0|[1-9][0-9]*)$/

function isChunkLike(cookieName: string, key: string): boolean {
  if (cookieName === key) return true
  const m = cookieName.match(CHUNK_LIKE_REGEX)
  return !!(m && m[1] === key)
}

function stringToBase64URL(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function stringFromBase64URL(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

async function combineChunks(
  key: string,
  retrieveChunk: (name: string) => Promise<string | null | undefined> | string | null | undefined
): Promise<string | null> {
  const value = await retrieveChunk(key)
  if (value) return value
  const values: string[] = []
  for (let i = 0; ; i++) {
    const chunkName = `${key}.${i}`
    const chunk = await retrieveChunk(chunkName)
    if (!chunk) break
    values.push(chunk)
  }
  return values.length > 0 ? values.join('') : null
}

function createChunks(key: string, value: string): { name: string; value: string }[] {
  let encoded = encodeURIComponent(value)
  if (encoded.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }]
  }
  const chunks: string[] = []
  while (encoded.length > 0) {
    let head = encoded.slice(0, MAX_CHUNK_SIZE)
    const lastEsc = head.lastIndexOf('%')
    if (lastEsc > MAX_CHUNK_SIZE - 3) {
      head = head.slice(0, lastEsc)
    }
    let valueHead = ''
    while (head.length > 0) {
      try {
        valueHead = decodeURIComponent(head)
        break
      } catch {
        if (head.at(-3) === '%' && head.length > 3) {
          head = head.slice(0, -3)
        } else {
          throw new Error('Invalid chunk')
        }
      }
    }
    chunks.push(valueHead)
    encoded = encoded.slice(head.length)
  }
  return chunks.map((v, i) => ({ name: `${key}.${i}`, value: v }))
}

function getDefaultOptions(): { path: string; sameSite: 'lax'; maxAge: number; secure?: boolean } {
  const secure =
    typeof window !== 'undefined' && window.location?.protocol === 'https:'
  return {
    path: '/',
    sameSite: 'lax',
    maxAge: 400 * 24 * 60 * 60,
    ...(secure && { secure: true }),
  }
}

function isCodeVerifierKey(name: string): boolean {
  return name.includes('-code-verifier')
}

/**
 * Creates a storage adapter that mirrors PKCE code verifier to sessionStorage
 * as a fallback when cookies fail (e.g. PKCE code verifier not found).
 */
export function createPkceStorage(
  storageKey: string
): { storage: { isServer: boolean; getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void> } } {

  const getFromSessionStorage = (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  }

  const setInSessionStorage = (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(key, value)
    } catch {
      // ignore
    }
  }

  const removeFromSessionStorage = (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // ignore
    }
  }

  const getAll = (keyHints: string[]) => {
    const parsed = cookie.parse(typeof document !== 'undefined' ? document.cookie : '')
    const cookieList = Object.keys(parsed).map((name) => ({ name, value: parsed[name] ?? '' }))
    // Fallback: if code-verifier not in cookies, try sessionStorage
    if (typeof window !== 'undefined') {
      for (const hint of keyHints) {
        if (isCodeVerifierKey(hint)) {
          const fromStorage = getFromSessionStorage(hint)
          if (fromStorage && !cookieList.some((c) => c.name === hint || isChunkLike(c.name, hint))) {
            cookieList.push({ name: hint, value: fromStorage })
          }
          for (let i = 0; ; i++) {
            const chunkName = `${hint}.${i}`
            const chunk = getFromSessionStorage(chunkName)
            if (!chunk) break
            if (!cookieList.some((c) => c.name === chunkName)) {
              cookieList.push({ name: chunkName, value: chunk })
            }
          }
        }
      }
    }
    return Promise.resolve(cookieList)
  }

  const setAll = (items: { name: string; value: string; options?: object }[]) => {
    if (typeof document !== 'undefined') {
      const opts = getDefaultOptions()
      items.forEach(({ name, value, options }) => {
        document.cookie = cookie.serialize(name, value, { ...opts, ...options })
        if (isCodeVerifierKey(name)) {
          setInSessionStorage(name, value)
        }
      })
    }
    return Promise.resolve()
  }

  const storage = {
    isServer: false,
    getItem: async (key: string): Promise<string | null> => {
      const allCookies = await getAll([key])
      const chunked = await combineChunks(key, (chunkName) => {
        const c = allCookies.find((x) => x.name === chunkName)
        return c?.value ?? null
      })
      if (!chunked) return null
      let decoded = chunked
      if (chunked.startsWith(BASE64_PREFIX)) {
        decoded = stringFromBase64URL(chunked.substring(BASE64_PREFIX.length))
      }
      return decoded
    },
    setItem: async (key: string, value: string): Promise<void> => {
      const encoded = BASE64_PREFIX + stringToBase64URL(value)
      const chunks = createChunks(key, encoded)
      if (typeof document !== 'undefined') {
        const opts = getDefaultOptions()
        const allCookies = await getAll([key])
        const toRemove = allCookies
          .filter((c) => isChunkLike(c.name, key))
          .filter((c) => !chunks.some((ch) => ch.name === c.name))
        toRemove.forEach((c) => {
          document.cookie = cookie.serialize(c.name, '', { ...opts, maxAge: 0 })
          if (isCodeVerifierKey(c.name)) removeFromSessionStorage(c.name)
        })
        chunks.forEach(({ name, value }) => {
          document.cookie = cookie.serialize(name, value, opts)
          if (isCodeVerifierKey(name)) setInSessionStorage(name, value)
        })
      }
    },
    removeItem: async (key: string): Promise<void> => {
      const allCookies = await getAll([key])
      const toRemove = allCookies.filter((c) => isChunkLike(c.name, key))
      if (typeof document !== 'undefined') {
        const opts = getDefaultOptions()
        toRemove.forEach((c) => {
          document.cookie = cookie.serialize(c.name, '', { ...opts, maxAge: 0 })
          if (isCodeVerifierKey(c.name)) removeFromSessionStorage(c.name)
        })
      }
    },
  }

  return { storage }
}

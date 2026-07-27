import type { PublicUser, ScanRecord } from '@qrush/shared'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api.ts'

interface AuthValue {
  user: PublicUser | null
  score: number
  rank: number
  scans: ScanRecord[]
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [score, setScore] = useState(0)
  const [rank, setRank] = useState(0)
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await api.me()
      setUser(me.user)
      setScore(me.score)
      setRank(me.rank)
      setScans(me.scans)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const authenticate = useCallback(
    async (action: 'login' | 'register', username: string, password: string) => {
      const result = await api[action](username, password)
      setToken(result.token)
      setUser(result.user)
      await refresh()
    },
    [refresh],
  )

  const value = useMemo<AuthValue>(
    () => ({
      user,
      score,
      rank,
      scans,
      loading,
      login: (u, p) => authenticate('login', u, p),
      register: (u, p) => authenticate('register', u, p),
      logout: () => {
        setToken(null)
        setUser(null)
        setScore(0)
        setRank(0)
        setScans([])
      },
      refresh,
    }),
    [user, score, rank, scans, loading, authenticate, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth должен вызываться внутри AuthProvider')
  return value
}

import type { EventState, LeaderboardRow, ServerMessage } from '@qrush/shared'
import { useEffect, useRef, useState } from 'react'
import { api } from './api.ts'

export interface LiveData {
  event: EventState | null
  leaderboard: LeaderboardRow[]
  connected: boolean
}

/**
 * Живое состояние ивента: сначала загружаем снапшот по HTTP,
 * дальше держим WebSocket с авто-переподключением.
 */
export function useLive(): LiveData {
  const [event, setEvent] = useState<EventState | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [connected, setConnected] = useState(false)
  const retry = useRef(0)

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    void api.event().then(setEvent).catch(() => undefined)
    void api.leaderboard().then(setLeaderboard).catch(() => undefined)

    const connect = () => {
      if (disposed) return
      const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${scheme}://${location.host}/ws`)

      socket.onopen = () => {
        retry.current = 0
        setConnected(true)
      }

      socket.onmessage = (raw) => {
        if (typeof raw.data !== 'string' || raw.data === 'pong') return
        const message = JSON.parse(raw.data) as ServerMessage
        if (message.type === 'state') setEvent(message.event)
        if (message.type === 'leaderboard') setLeaderboard(message.leaderboard)
      }

      socket.onclose = () => {
        setConnected(false)
        if (disposed) return
        retry.current = Math.min(retry.current + 1, 6)
        reconnectTimer = setTimeout(connect, 400 * 2 ** retry.current)
      }

      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  return { event, leaderboard, connected }
}

/** Локальный тик раз в 250 мс — для плавного обратного отсчёта. */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [active])
  return now
}

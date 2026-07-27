import type { ServerMessage } from '@qrush/shared'
import { expireEventIfNeeded, getEventState, getLeaderboard } from './store.ts'

interface Sink {
  send: (payload: string) => unknown
}

const clients = new Set<Sink>()

export function addClient(client: Sink): void {
  clients.add(client)
}

export function removeClient(client: Sink): void {
  clients.delete(client)
}

export function clientCount(): number {
  return clients.size
}

export function broadcast(message: ServerMessage): void {
  const payload = JSON.stringify(message)
  for (const client of clients) {
    try {
      client.send(payload)
    } catch {
      clients.delete(client)
    }
  }
}

export function broadcastState(): void {
  broadcast({ type: 'state', event: getEventState() })
}

export function broadcastLeaderboard(): void {
  broadcast({ type: 'leaderboard', leaderboard: getLeaderboard() })
}

export function broadcastAll(): void {
  broadcastState()
  broadcastLeaderboard()
}

/**
 * Тикер: закрывает ивент по истечении времени и раз в несколько секунд
 * рассылает состояние, чтобы клиентские таймеры не расходились.
 */
export function startTicker(): Timer {
  let sinceSync = 0
  return setInterval(() => {
    const finished = expireEventIfNeeded()
    sinceSync += 1
    if (finished) {
      broadcastAll()
      sinceSync = 0
      return
    }
    if (sinceSync >= 5 && clients.size > 0) {
      broadcastState()
      sinceSync = 0
    }
  }, 1000)
}

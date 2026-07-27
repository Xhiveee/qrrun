import type { EventState } from '@qrush/shared'
import { EVENT_STATUS_LABEL, formatDuration } from '@qrush/shared'
import { useNow } from '../lib/live.ts'

/** Оставшееся время с поправкой на дрейф локальных часов относительно сервера. */
export function remainingFor(event: EventState, now: number): number {
  if (event.status === 'paused') return event.remainingMs
  if (event.status !== 'running') return 0
  return Math.max(0, event.remainingMs - (now - event.serverTime))
}

export function Countdown({ event, compact = false }: { event: EventState; compact?: boolean }) {
  const now = useNow(event.status === 'running')
  const remaining = remainingFor(event, now)
  const total = event.durationSec * 1000
  const progress = total > 0 ? 1 - remaining / total : 0
  const live = event.status === 'running' || event.status === 'paused'

  if (compact) {
    return (
      <span className="tabular text-sm font-bold tracking-[0.12em]">
        {live ? formatDuration(remaining) : EVENT_STATUS_LABEL[event.status]}
      </span>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-ink-soft text-[11px] font-bold tracking-[0.28em] uppercase">
          {live ? 'до конца' : 'таймер'}
        </span>
        <span
          className={`text-[11px] font-bold tracking-[0.28em] uppercase ${
            event.status === 'running' ? 'text-accent animate-blink' : 'text-ink-soft'
          }`}
        >
          {EVENT_STATUS_LABEL[event.status]}
        </span>
      </div>

      <div className="display tabular text-[clamp(3.5rem,16vw,9rem)]">
        {live ? formatDuration(remaining) : formatDuration(total)}
      </div>

      <svg className="mt-3 block h-3 w-full" viewBox="0 0 100 3" preserveAspectRatio="none" aria-hidden>
        <rect width="100" height="3" fill="#0A0A0A" fillOpacity="0.12" />
        <rect
          width={Math.max(0, Math.min(100, progress * 100))}
          height="3"
          fill="#FF3B14"
          style={{ transition: 'width 250ms linear' }}
        />
      </svg>
    </div>
  )
}

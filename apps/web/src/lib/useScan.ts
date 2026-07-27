import type { ScanResult } from '@qrush/shared'
import { useCallback, useRef, useState } from 'react'
import { ApiError, api } from './api.ts'
import { useAuth } from './auth.tsx'

export interface ScanFeedback {
  kind: 'accepted' | 'duplicate' | 'error'
  title: string
  detail: string
  hint: string | null
  /** Меняется при каждом скане — используется как key для перезапуска анимации. */
  stamp: number
}

export function useScan() {
  const { refresh } = useAuth()
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const submit = useCallback(
    async (code: string): Promise<ScanResult | null> => {
      if (inFlight.current) return null
      inFlight.current = true
      setBusy(true)
      try {
        const result = await api.scan(code)
        navigator.vibrate?.(result.status === 'accepted' ? [40, 60, 40] : 25)
        setFeedback({
          kind: result.status,
          title: result.status === 'accepted' ? `+1 · ${result.label}` : `Уже засчитан: ${result.label}`,
          detail:
            result.status === 'accepted'
              ? `Твой счёт ${result.score}, место ${result.rank}. Осталось найти ${result.remainingQr}.`
              : `Этот код у тебя уже есть. Счёт ${result.score}, место ${result.rank}.`,
          hint: result.hint,
          stamp: Date.now(),
        })
        await refresh()
        return result
      } catch (failure) {
        setFeedback({
          kind: 'error',
          title: 'Не засчитано',
          detail: failure instanceof ApiError ? failure.message : 'Сеть недоступна, попробуй ещё раз',
          hint: null,
          stamp: Date.now(),
        })
        return null
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [refresh],
  )

  return { feedback, busy, submit, setFeedback }
}

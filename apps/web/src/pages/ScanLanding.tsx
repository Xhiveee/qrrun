import { useEffect, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button } from '../components/Ui.tsx'
import { useAuth } from '../lib/auth.tsx'
import { useScan } from '../lib/useScan.ts'

/**
 * Точка входа по ссылке из напечатанного QR-кода: /s/<TOKEN>.
 * Код засчитывается автоматически сразу после открытия страницы.
 */
export function ScanLanding() {
  const { token = '' } = useParams()
  const { user, loading } = useAuth()
  const { feedback, submit } = useScan()
  const fired = useRef(false)

  useEffect(() => {
    if (!user || fired.current) return
    fired.current = true
    void submit(token)
  }, [user, token, submit])

  if (loading) {
    return (
      <div className="text-ink-soft flex h-[60vh] items-center justify-center text-xs font-bold tracking-[0.3em] uppercase">
        проверяем…
      </div>
    )
  }

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`/s/${token}`)}`} replace />

  const tone =
    feedback?.kind === 'accepted'
      ? 'bg-lime'
      : feedback?.kind === 'duplicate'
        ? 'bg-paper-2'
        : feedback?.kind === 'error'
          ? 'bg-accent text-paper'
          : 'bg-paper'

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <div className={`rule animate-pop p-7 ${tone}`}>
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">код</span>
          <span className="tabular text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">
            {token}
          </span>
        </div>

        {!feedback ? (
          <>
            <div className="display text-[clamp(2.4rem,10vw,4rem)]">Засчитываем…</div>
            <svg className="mt-6 w-full" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden>
              <rect width="100" height="6" fill="#0A0A0A" fillOpacity="0.1" />
              <rect width="30" height="6" fill="#FF3B14">
                <animate attributeName="x" values="-30;100" dur="1.1s" repeatCount="indefinite" />
              </rect>
            </svg>
          </>
        ) : (
          <>
            <div className="display text-[clamp(2.2rem,9vw,3.6rem)]">{feedback.title}</div>
            <p className="mt-3 text-base font-semibold">{feedback.detail}</p>
            {feedback.hint ? (
              <p className="text-ink-soft mt-3 border-t-2 border-dashed border-current pt-3 text-base font-medium">
                {feedback.hint}
              </p>
            ) : null}
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/play">
            <Button tone="ink">Сканировать дальше</Button>
          </Link>
          <Link to="/">
            <Button tone="ghost">Таблица лидеров</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

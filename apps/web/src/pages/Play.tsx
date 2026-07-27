import type { EventState, LeaderboardRow } from '@qrush/shared'
import { EVENT_STATUS_LABEL } from '@qrush/shared'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Countdown } from '../components/Countdown.tsx'
import { Leaderboard } from '../components/Leaderboard.tsx'
import { Scanner } from '../components/Scanner.tsx'
import { Badge, Button, Field, Panel } from '../components/Ui.tsx'
import { useAuth } from '../lib/auth.tsx'
import { useScan } from '../lib/useScan.ts'

function FeedbackCard({ feedback }: { feedback: NonNullable<ReturnType<typeof useScan>['feedback']> }) {
  const tone =
    feedback.kind === 'accepted'
      ? 'bg-lime border-ink'
      : feedback.kind === 'duplicate'
        ? 'bg-paper-2 border-ink'
        : 'bg-accent text-paper border-ink'

  return (
    <div key={feedback.stamp} className={`animate-pop border-2 p-4 ${tone}`}>
      <div className="display text-2xl">{feedback.title}</div>
      <p className="mt-1.5 text-sm font-semibold">{feedback.detail}</p>
      {feedback.hint ? (
        <p className="text-ink-soft mt-2 border-t-2 border-dashed border-current pt-2 text-sm font-medium">
          {feedback.hint}
        </p>
      ) : null}
    </div>
  )
}

export function Play({ event, leaderboard }: { event: EventState | null; leaderboard: LeaderboardRow[] }) {
  const { user, score, rank, scans } = useAuth()
  const { feedback, busy, submit } = useScan()
  const [manual, setManual] = useState('')

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-[clamp(2.4rem,9vw,4.5rem)]">Сначала вход</h1>
        <p className="text-ink-soft mt-4 text-sm font-medium">
          Сканы привязываются к твоему нику — без аккаунта очки не начисляются.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/login?next=/play">
            <Button tone="accent">Войти</Button>
          </Link>
          <Link to="/register?next=/play">
            <Button tone="ghost">Регистрация</Button>
          </Link>
        </div>
      </div>
    )
  }

  const running = event?.status === 'running'
  const target = event?.activeQrCount || event?.targetQrCount || 0
  const progress = target > 0 ? Math.min(1, score / target) : 0

  async function submitManual(cause: FormEvent) {
    cause.preventDefault()
    if (!manual.trim()) return
    await submit(manual)
    setManual('')
  }

  return (
    <div className="animate-rise mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <div className="rule bg-paper flex items-center justify-between gap-4 p-4">
          <div>
            <div className="text-ink-soft text-[10px] font-bold tracking-[0.24em] uppercase">твой счёт</div>
            <div className="tabular display text-[clamp(2.6rem,11vw,4.5rem)]">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-ink-soft text-[10px] font-bold tracking-[0.24em] uppercase">место</div>
            <div className="tabular display text-accent text-[clamp(2.6rem,11vw,4.5rem)]">
              {rank || '—'}
            </div>
          </div>
          <svg className="h-20 w-20 shrink-0 -rotate-90" viewBox="0 0 40 40" aria-hidden>
            <circle cx="20" cy="20" r="17" fill="none" stroke="#0A0A0A" strokeOpacity="0.12" strokeWidth="5" />
            <circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke="#FF3B14"
              strokeWidth="5"
              strokeDasharray={`${progress * 106.8} 106.8`}
              style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)' }}
            />
          </svg>
        </div>

        {!running && event ? (
          <div className="rule bg-ink text-paper flex items-center justify-between gap-3 p-4">
            <span className="text-[11px] font-bold tracking-[0.24em] uppercase">
              {event.status === 'idle'
                ? 'ивент ещё не начался'
                : event.status === 'paused'
                  ? 'пауза — сканы не засчитываются'
                  : 'ивент завершён'}
            </span>
            <Badge tone="accent">{EVENT_STATUS_LABEL[event.status]}</Badge>
          </div>
        ) : null}

        <Scanner onCode={(code) => void submit(code)} disabled={busy} />

        <form onSubmit={submitManual} className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Или введи код с листа"
              value={manual}
              onChange={(cause) => setManual(cause.target.value.toUpperCase())}
              placeholder="ABCD123456"
              maxLength={64}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>
          <Button type="submit" disabled={busy || !manual.trim()}>
            Ок
          </Button>
        </form>

        {feedback ? <FeedbackCard feedback={feedback} /> : null}
      </div>

      <div className="flex flex-col gap-5">
        {event ? (
          <div className="rule bg-paper p-5">
            <Countdown event={event} />
          </div>
        ) : null}

        <Panel title="Таблица лидеров" className="lg:sticky lg:top-24">
          <Leaderboard rows={leaderboard} highlightUserId={user.id} limit={12} />
        </Panel>

        <Panel title={`Мои коды · ${scans.length}`}>
          {scans.length === 0 ? (
            <p className="text-ink-soft text-xs font-bold tracking-[0.18em] uppercase">пока пусто</p>
          ) : (
            <ul className="flex flex-col">
              {scans.map((scan) => (
                <li
                  key={scan.qrId}
                  className="border-ink/15 flex items-center justify-between border-b py-2 text-sm font-semibold last:border-0"
                >
                  <span className="truncate uppercase">{scan.label}</span>
                  <span className="tabular text-ink-soft text-xs">
                    {new Date(scan.scannedAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

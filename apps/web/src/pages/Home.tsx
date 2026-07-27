import type { EventState, LeaderboardRow } from '@qrush/shared'
import { Link } from 'react-router-dom'
import { Countdown } from '../components/Countdown.tsx'
import { Leaderboard } from '../components/Leaderboard.tsx'
import { Marquee } from '../components/Marquee.tsx'
import { Button, Panel } from '../components/Ui.tsx'
import { useAuth } from '../lib/auth.tsx'

function Stat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className={`rule flex flex-col justify-between p-4 ${accent ? 'bg-ink text-paper' : 'bg-paper'}`}>
      <span className="tabular display text-[clamp(2rem,7vw,3.4rem)]">{value}</span>
      <span className="mt-2 text-[10px] font-bold tracking-[0.24em] uppercase opacity-70">{label}</span>
    </div>
  )
}

export function Home({ event, leaderboard }: { event: EventState | null; leaderboard: LeaderboardRow[] }) {
  const { user, score } = useAuth()

  if (!event) {
    return (
      <div className="text-ink-soft flex h-[60vh] items-center justify-center text-xs font-bold tracking-[0.3em] uppercase">
        загрузка…
      </div>
    )
  }

  const collected = event.activeQrCount || event.targetQrCount
  const found = leaderboard.reduce((max, row) => Math.max(max, row.score), 0)

  return (
    <div className="animate-rise">
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-accent mb-4 text-[11px] font-bold tracking-[0.34em] uppercase">
              {event.tagline}
            </p>
            <h1 className="display text-[clamp(3.2rem,13vw,8.5rem)]">
              {event.name}
            </h1>
            <div className="border-ink mt-6 border-t-2 pt-5">
              <p className="max-w-md text-base leading-snug font-medium">
                По площадке развешаны бумажные QR-коды. Найди их, отсканируй телефоном и поднимись
                в таблице лидеров. Побеждает тот, кто соберёт больше всех.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/play">
                <Button tone="accent">Сканировать</Button>
              </Link>
              {!user ? (
                <Link to="/register">
                  <Button tone="ghost">Зарегистрироваться</Button>
                </Link>
              ) : (
                <span className="rule tabular flex items-center px-5 py-3 text-sm font-bold tracking-[0.16em] uppercase">
                  твой счёт: {score}
                </span>
              )}
            </div>
          </div>

          <div className="rule bg-paper flex flex-col justify-between p-5">
            <Countdown event={event} />
            <div className="mt-6 grid grid-cols-3 gap-px">
              {[
                ['участников', event.participantCount],
                ['кодов', collected],
                ['сканов', event.totalScans],
              ].map(([label, value]) => (
                <div key={label as string} className="border-ink/20 border-t pt-2">
                  <div className="tabular text-2xl font-bold">{value as number}</div>
                  <div className="text-ink-soft text-[10px] font-bold tracking-[0.2em] uppercase">
                    {label as string}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Marquee
        items={[
          `${event.name} в эфире`,
          'найди QR',
          'отсканируй',
          'обгони соперников',
          `лидер: ${leaderboard[0]?.username ?? '—'}`,
        ]}
      />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[2fr_1fr]">
        <Panel
          title="Таблица лидеров · реальное время"
          action={
            <span className="text-ink-soft text-[10px] font-bold tracking-[0.2em] uppercase">
              {leaderboard.length} игроков
            </span>
          }
        >
          <Leaderboard rows={leaderboard} highlightUserId={user?.id} />
        </Panel>

        <div className="grid content-start gap-4">
          <Stat value={found} label="лучший результат" accent />
          <Stat value={collected} label="кодов на площадке" />
          <Stat value={Math.round(event.durationSec / 60)} label="минут на всё" />
        </div>
      </section>
    </div>
  )
}

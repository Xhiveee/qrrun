import type { LeaderboardRow } from '@qrush/shared'

const ROW_HEIGHT = 66

const MEDALS = ['#FF3B14', '#0A0A0A', '#1B3BFF']

/**
 * Реалтайм-таблица лидеров. Строки позиционированы абсолютно и переезжают
 * через CSS-transform — при смене мест получается плавная перестановка.
 */
export function Leaderboard({
  rows,
  highlightUserId,
  limit = 20,
}: {
  rows: LeaderboardRow[]
  highlightUserId?: number
  limit?: number
}) {
  const visible = rows.slice(0, limit)
  const best = visible[0]?.score ?? 1

  if (visible.length === 0) {
    return (
      <div className="hairline text-ink-soft flex h-40 flex-col items-center justify-center gap-2 border-dashed text-center">
        <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden>
          <rect x="1" y="1" width="44" height="44" fill="none" stroke="#0A0A0A" strokeOpacity="0.3" />
          <rect x="10" y="26" width="8" height="10" fill="#0A0A0A" fillOpacity="0.25">
            <animate attributeName="height" values="10;18;10" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="21" y="18" width="8" height="18" fill="#FF3B14" fillOpacity="0.5">
            <animate attributeName="height" values="18;10;18" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="32" y="30" width="4" height="6" fill="#0A0A0A" fillOpacity="0.25" />
        </svg>
        <span className="text-xs font-bold tracking-[0.22em] uppercase">Пока никто не сканировал</span>
      </div>
    )
  }

  return (
    <div className="relative" style={{ height: visible.length * ROW_HEIGHT }}>
      {visible.map((row) => {
        const mine = row.userId === highlightUserId
        return (
          <div
            key={row.userId}
            className="absolute inset-x-0 top-0 will-change-transform"
            style={{
              transform: `translateY(${(row.rank - 1) * ROW_HEIGHT}px)`,
              transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
              height: ROW_HEIGHT,
            }}
          >
            <div
              className={`hairline relative flex h-[58px] items-center gap-3 overflow-hidden px-3 ${
                mine ? 'border-accent bg-accent/5 border-2' : 'bg-paper'
              }`}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${(row.score / best) * 100}%`,
                  background: mine ? 'rgba(255,59,20,0.14)' : 'rgba(10,10,10,0.06)',
                  transition: 'width 620ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />

              <span
                className="tabular relative z-10 w-9 shrink-0 text-center text-lg font-bold"
                style={{ color: MEDALS[row.rank - 1] ?? '#4A4741' }}
              >
                {String(row.rank).padStart(2, '0')}
              </span>

              <svg className="relative z-10 shrink-0" width="10" height="34" viewBox="0 0 10 34" aria-hidden>
                <rect width="2" height="34" fill={row.rank <= 3 ? '#FF3B14' : '#0A0A0A'} opacity="0.6" />
              </svg>

              <span className="relative z-10 flex-1 truncate text-base font-bold tracking-[-0.01em] uppercase">
                {row.username}
                {mine ? <span className="text-accent ml-2 text-[10px] tracking-[0.2em]">ТЫ</span> : null}
              </span>

              <span className="tabular relative z-10 text-2xl font-bold">{row.score}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

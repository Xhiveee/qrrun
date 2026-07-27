export function Marquee({ items, fast = false }: { items: string[]; fast?: boolean }) {
  const line = [...items, ...items]
  return (
    <div className="border-ink bg-ink text-paper overflow-hidden border-y-2 py-2">
      <div className={`flex w-max ${fast ? 'animate-marquee-fast' : 'animate-marquee'}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {line.map((item, index) => (
              <span
                key={`${copy}-${index}`}
                className="flex items-center gap-6 px-6 text-xs font-bold tracking-[0.3em] whitespace-nowrap uppercase"
              >
                {item}
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                  <rect width="8" height="8" fill="#FF3B14" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

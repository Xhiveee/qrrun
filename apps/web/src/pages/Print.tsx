import { useEffect, useState } from 'react'
import { Button } from '../components/Ui.tsx'
import { api, type PrintableQr } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'

const PER_PAGE_OPTIONS = [1, 2, 4] as const

/**
 * Печатная раскладка: коды рисуются inline-SVG, поэтому масштабируются
 * без потери качества и печатаются чёрным по белому.
 */
export function Print() {
  const { user, loading } = useAuth()
  const [codes, setCodes] = useState<PrintableQr[]>([])
  const [perPage, setPerPage] = useState<(typeof PER_PAGE_OPTIONS)[number]>(2)
  const [onlyActive, setOnlyActive] = useState(true)

  useEffect(() => {
    if (user?.isAdmin) void api.admin.printData().then(setCodes)
  }, [user])

  if (loading) return null
  if (!user?.isAdmin)
    return <p className="p-10 text-center text-sm font-bold uppercase">Только для администратора</p>

  const visible = codes.filter((code) => !onlyActive || code.active)
  const cols = perPage === 1 ? 1 : 2

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="no-print border-b-2 border-black bg-[#F2F0E9] px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4">
          <span className="text-xs font-bold tracking-[0.24em] uppercase">
            печать · {visible.length} кодов
          </span>

          <label className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(cause) => setOnlyActive(cause.target.checked)}
            />
            только активные
          </label>

          <div className="flex items-center gap-1">
            {PER_PAGE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setPerPage(option)}
                className={`cursor-pointer border-2 border-black px-3 py-1 text-[11px] font-bold uppercase ${
                  perPage === option ? 'bg-black text-white' : ''
                }`}
              >
                {option} на лист
              </button>
            ))}
          </div>

          <Button className="ml-auto" tone="accent" onClick={() => window.print()}>
            Печать
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className={`grid gap-6 ${cols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {visible.map((code, index) => (
            <article
              key={code.id}
              className={`flex flex-col items-center border-2 border-black p-6 ${
                (index + 1) % perPage === 0 ? 'print-page' : ''
              }`}
              style={{ breakInside: 'avoid' }}
            >
              <div className="mb-4 w-full border-b-2 border-black pb-2 text-center">
                <div className="text-[10px] font-bold tracking-[0.34em] uppercase">QRUSH</div>
                <div className="text-2xl font-bold tracking-[-0.03em] uppercase">{code.label}</div>
              </div>

              <div
                className="w-full max-w-[320px] [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: code.svg }}
              />

              <div className="mt-4 w-full border-t-2 border-black pt-2 text-center">
                <div className="font-mono text-3xl font-bold tracking-[0.16em]">{code.token}</div>
                <div className="mt-1 text-[10px] font-bold tracking-[0.16em] break-all uppercase opacity-70">
                  {code.url}
                </div>
                <div className="mt-2 text-[11px] font-semibold">
                  Наведи камеру телефона · или введи код на сайте
                </div>
              </div>
            </article>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="py-20 text-center text-sm font-bold uppercase">
            Нет кодов для печати — создай их в админке
          </p>
        ) : null}
      </div>
    </div>
  )
}

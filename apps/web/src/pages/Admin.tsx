import type { AdminOverview, EventState } from '@qrush/shared'
import { EVENT_STATUS_LABEL } from '@qrush/shared'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Countdown } from '../components/Countdown.tsx'
import { Leaderboard } from '../components/Leaderboard.tsx'
import { Badge, Button, Field, Notice, Panel } from '../components/Ui.tsx'
import { ApiError, api } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'

type Command = 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'restart'

function ControlButton({
  label,
  hint,
  tone,
  disabled,
  onClick,
}: {
  label: string
  hint: string
  tone: 'ink' | 'accent' | 'ghost'
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rule group flex cursor-pointer flex-col items-start gap-1 p-3 text-left transition-all duration-200 active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === 'accent'
          ? 'bg-accent text-paper hover:bg-ink'
          : tone === 'ink'
            ? 'bg-ink text-paper hover:bg-accent'
            : 'hover:bg-ink hover:text-paper'
      }`}
    >
      <span className="text-sm font-bold tracking-[0.16em] uppercase">{label}</span>
      <span className="text-[10px] font-semibold tracking-[0.1em] uppercase opacity-60">{hint}</span>
    </button>
  )
}

export function Admin({ liveEvent }: { liveEvent: EventState | null }) {
  const { user, loading } = useAuth()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({ name: '', tagline: '', minutes: 60, targetQrCount: 20 })
  const [qrForm, setQrForm] = useState({ count: 10, labelPrefix: 'ТОЧКА' })

  const load = useCallback(async () => {
    try {
      const overview = await api.admin.overview()
      setData(overview)
      setForm((current) =>
        current.name
          ? current
          : {
              name: overview.event.name,
              tagline: overview.event.tagline,
              minutes: Math.round(overview.event.durationSec / 60),
              targetQrCount: overview.event.targetQrCount,
            },
      )
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Не удалось загрузить данные')
    }
  }, [])

  useEffect(() => {
    if (user?.isAdmin) void load()
  }, [user, load, liveEvent?.totalScans, liveEvent?.participantCount, liveEvent?.status])

  async function run<T>(action: () => Promise<T>, message: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
      setNotice(message)
      setTimeout(() => setNotice(null), 2600)
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Операция не выполнена')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="px-4 py-20 text-center text-xs tracking-[0.3em] uppercase">…</div>

  if (!user?.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-[clamp(2.4rem,9vw,4.5rem)]">Только для админа</h1>
        <p className="text-ink-soft mt-4 text-sm font-medium">
          Войди учётной записью администратора, чтобы управлять ивентом.
        </p>
        <Link to="/login?next=/admin" className="mt-6 inline-block">
          <Button tone="accent">Войти</Button>
        </Link>
      </div>
    )
  }

  if (!data) return <div className="px-4 py-20 text-center text-xs tracking-[0.3em] uppercase">загрузка…</div>

  const event = liveEvent ?? data.event
  const command = (name: Command, message: string) => run(() => api.admin.command(name), message)

  async function saveSettings(cause: FormEvent) {
    cause.preventDefault()
    await run(
      () =>
        api.admin.settings({
          name: form.name,
          tagline: form.tagline,
          durationSec: Math.round(form.minutes * 60),
          targetQrCount: form.targetQrCount,
        }),
      'Настройки сохранены',
    )
  }

  return (
    <div className="animate-rise mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-[11px] font-bold tracking-[0.34em] uppercase">панель управления</p>
          <h1 className="display text-[clamp(2.4rem,9vw,5rem)]">{event.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={event.status === 'running' ? 'accent' : 'ink'}>{EVENT_STATUS_LABEL[event.status]}</Badge>
          <Countdown event={event} compact />
          <Link to="/admin/print" target="_blank">
            <Button tone="ghost">Печать QR</Button>
          </Link>
        </div>
      </header>

      {error ? <Notice kind="error">{error}</Notice> : null}
      {notice ? <Notice kind="ok">{notice}</Notice> : null}

      <Panel title="Управление ивентом">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <ControlButton
            label="Старт"
            hint="запустить таймер"
            tone="accent"
            disabled={busy || event.status === 'running'}
            onClick={() => void command(event.status === 'paused' ? 'resume' : 'start', 'Ивент запущен')}
          />
          <ControlButton
            label="Пауза"
            hint="заморозить время"
            tone="ink"
            disabled={busy || event.status !== 'running'}
            onClick={() => void command('pause', 'Ивент на паузе')}
          />
          <ControlButton
            label="Стоп"
            hint="завершить сейчас"
            tone="ink"
            disabled={busy || event.status === 'idle' || event.status === 'finished'}
            onClick={() => void command('stop', 'Ивент завершён')}
          />
          <ControlButton
            label="Заново"
            hint="сброс очков + старт"
            tone="ghost"
            disabled={busy}
            onClick={() => {
              if (confirm('Начать заново? Все очки участников будут удалены.'))
                void command('restart', 'Ивент перезапущен')
            }}
          />
          <ControlButton
            label="Сброс"
            hint="очки в ноль, ожидание"
            tone="ghost"
            disabled={busy}
            onClick={() => {
              if (confirm('Сбросить результаты? Все сканы будут удалены.'))
                void command('reset', 'Результаты сброшены')
            }}
          />
          <div className="rule flex flex-col justify-center gap-1 p-3">
            <span className="tabular text-2xl font-bold">{event.totalScans}</span>
            <span className="text-ink-soft text-[10px] font-bold tracking-[0.2em] uppercase">
              всего сканов
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Настройки">
          <form onSubmit={saveSettings} className="flex flex-col gap-4">
            <Field
              label="Название ивента"
              value={form.name}
              maxLength={40}
              onChange={(cause) => setForm({ ...form, name: cause.target.value })}
            />
            <Field
              label="Подзаголовок"
              value={form.tagline}
              maxLength={60}
              onChange={(cause) => setForm({ ...form, tagline: cause.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Длительность, мин"
                type="number"
                min={1}
                max={1440}
                value={form.minutes}
                onChange={(cause) => setForm({ ...form, minutes: Number(cause.target.value) })}
              />
              <Field
                label="Кодов на площадке"
                type="number"
                min={1}
                max={2000}
                value={form.targetQrCount}
                hint={`создано активных: ${event.activeQrCount}`}
                onChange={(cause) => setForm({ ...form, targetQrCount: Number(cause.target.value) })}
              />
            </div>
            <Button type="submit" disabled={busy}>
              Сохранить
            </Button>
          </form>
        </Panel>

        <Panel
          title={`QR-коды · ${data.qrCodes.length}`}
          action={
            <button
              className="text-accent cursor-pointer text-[10px] font-bold tracking-[0.2em] uppercase"
              onClick={() => {
                if (confirm('Удалить все QR-коды? Сканы по ним тоже пропадут.'))
                  void run(() => api.admin.deleteAllQr(), 'QR-коды удалены')
              }}
            >
              удалить все
            </button>
          }
        >
          <div className="mb-4 grid grid-cols-[1fr_1.4fr_auto] items-end gap-2">
            <Field
              label="Сколько"
              type="number"
              min={1}
              max={500}
              value={qrForm.count}
              onChange={(cause) => setQrForm({ ...qrForm, count: Number(cause.target.value) })}
            />
            <Field
              label="Префикс названия"
              value={qrForm.labelPrefix}
              maxLength={24}
              onChange={(cause) => setQrForm({ ...qrForm, labelPrefix: cause.target.value })}
            />
            <Button
              tone="accent"
              disabled={busy}
              onClick={() =>
                void run(() => api.admin.createQr(qrForm.count, qrForm.labelPrefix), 'QR-коды созданы')
              }
            >
              Создать
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {data.qrCodes.length === 0 ? (
              <p className="text-ink-soft text-xs font-bold tracking-[0.18em] uppercase">
                кодов ещё нет — создай и распечатай
              </p>
            ) : (
              <ul className="flex flex-col">
                {data.qrCodes.map((qr) => (
                  <li
                    key={qr.id}
                    className="border-ink/15 flex items-center gap-2 border-b py-2 text-sm last:border-0"
                  >
                    <span className="tabular text-ink-soft w-24 shrink-0 text-xs font-bold">{qr.token}</span>
                    <input
                      defaultValue={qr.label}
                      className="focus:border-accent min-w-0 flex-1 border-b border-transparent bg-transparent font-semibold uppercase outline-none"
                      onBlur={(cause) => {
                        if (cause.target.value !== qr.label)
                          void run(() => api.admin.patchQr(qr.id, { label: cause.target.value }), 'Название обновлено')
                      }}
                    />
                    <span className="tabular text-ink-soft w-10 text-right text-xs">{qr.scanCount}</span>
                    <button
                      className="cursor-pointer px-1 text-[10px] font-bold tracking-[0.14em] uppercase"
                      onClick={() => void run(() => api.admin.patchQr(qr.id, { active: !qr.active }), 'Готово')}
                    >
                      <Badge tone={qr.active ? 'accent' : 'mute'}>{qr.active ? 'вкл' : 'выкл'}</Badge>
                    </button>
                    <button
                      className="hover:text-accent cursor-pointer px-1 text-sm font-bold"
                      title="Удалить"
                      onClick={() => void run(() => api.admin.deleteQr(qr.id), 'Код удалён')}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Таблица лидеров">
          <Leaderboard rows={data.leaderboard} limit={15} />
        </Panel>

        <Panel title={`Участники · ${data.users.filter((u) => !u.isAdmin).length}`}>
          <div className="max-h-96 overflow-y-auto">
            <ul className="flex flex-col">
              {data.users.map((participant) => (
                <li
                  key={participant.id}
                  className="border-ink/15 flex items-center gap-3 border-b py-2 text-sm last:border-0"
                >
                  <span className="flex-1 truncate font-bold uppercase">{participant.username}</span>
                  {participant.isAdmin ? <Badge tone="ink">админ</Badge> : null}
                  <span className="tabular w-10 text-right font-bold">{participant.score}</span>
                  {!participant.isAdmin ? (
                    <button
                      className="hover:text-accent cursor-pointer px-1 text-sm font-bold"
                      title="Удалить участника"
                      onClick={() => {
                        if (confirm(`Удалить участника ${participant.username}?`))
                          void run(() => api.admin.deleteUser(participant.id), 'Участник удалён')
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </div>
  )
}

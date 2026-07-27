import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

type Tone = 'ink' | 'accent' | 'ghost' | 'danger'

const TONES: Record<Tone, string> = {
  ink: 'bg-ink text-paper hover:bg-accent',
  accent: 'bg-accent text-paper hover:bg-ink',
  ghost: 'bg-transparent text-ink hover:bg-ink hover:text-paper',
  danger: 'bg-transparent text-ink hover:bg-ink hover:text-paper',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  block?: boolean
}

export function Button({ tone = 'ink', block, className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`rule inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-3 text-sm font-bold tracking-[0.16em] uppercase transition-all duration-200 active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-35 ${TONES[tone]} ${block ? 'w-full' : ''} ${className}`}
    />
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function Field({ label, hint, className = '', ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="text-ink-soft mb-1.5 block text-[11px] font-bold tracking-[0.22em] uppercase">
        {label}
      </span>
      <input
        {...rest}
        className={`rule bg-paper focus:border-accent placeholder:text-ink/25 w-full px-4 py-3 text-base outline-none transition-colors ${className}`}
      />
      {hint ? <span className="text-ink-soft mt-1 block text-xs">{hint}</span> : null}
    </label>
  )
}

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rule bg-paper ${className}`}>
      <header className="border-ink flex items-center justify-between gap-3 border-b-2 px-4 py-2.5">
        <h2 className="text-xs font-bold tracking-[0.24em] uppercase">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Badge({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'accent' | 'mute' }) {
  const map = {
    ink: 'bg-ink text-paper',
    accent: 'bg-accent text-paper',
    mute: 'bg-ink/10 text-ink',
  } as const
  return (
    <span className={`px-2 py-1 text-[10px] font-bold tracking-[0.2em] uppercase ${map[tone]}`}>
      {children}
    </span>
  )
}

export function Notice({ kind, children }: { kind: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const map = {
    error: 'border-accent text-accent animate-shake',
    ok: 'border-ink bg-lime text-ink animate-pop',
    info: 'border-ink/30 text-ink-soft',
  } as const
  return (
    <p className={`border-2 px-3 py-2 text-sm font-semibold ${map[kind]}`} role="status">
      {children}
    </p>
  )
}

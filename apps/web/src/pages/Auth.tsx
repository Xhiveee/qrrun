import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Field, Notice } from '../components/Ui.tsx'
import { ApiError } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'

export function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/play'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  async function submit(cause: FormEvent) {
    cause.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await (isRegister ? register(username, password) : login(username, password))
      navigate(next, { replace: true })
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Что-то пошло не так')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
      <div className="animate-rise">
        <p className="text-accent mb-3 text-[11px] font-bold tracking-[0.34em] uppercase">
          {isRegister ? 'новый игрок' : 'с возвращением'}
        </p>
        <h1 className="display text-[clamp(2.6rem,10vw,5.5rem)]">
          {isRegister ? 'Заяви о себе' : 'Войди в игру'}
        </h1>
        <p className="text-ink-soft mt-5 max-w-sm text-sm leading-relaxed font-medium">
          Ник виден всем в таблице лидеров. Пароль нужен, чтобы никто не занял твой результат.
        </p>

        <svg className="mt-8 w-full max-w-xs" viewBox="0 0 200 60" aria-hidden>
          {Array.from({ length: 20 }, (_, index) => (
            <rect key={index} x={index * 10} y={0} width="6" height="60" fill="#0A0A0A" opacity="0.08">
              <animate
                attributeName="height"
                values={`${10 + ((index * 7) % 40)};60;${10 + ((index * 13) % 45)}`}
                dur={`${2 + (index % 5)}s`}
                repeatCount="indefinite"
              />
            </rect>
          ))}
        </svg>
      </div>

      <form onSubmit={submit} className="rule bg-paper animate-pop flex flex-col gap-4 p-6">
        <Field
          label="Ник"
          value={username}
          onChange={(cause) => setUsername(cause.target.value)}
          autoComplete="username"
          maxLength={24}
          required
          placeholder="например, Метеор"
        />
        <Field
          label="Пароль"
          type="password"
          value={password}
          onChange={(cause) => setPassword(cause.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={6}
          required
          placeholder="минимум 6 символов"
        />

        {error ? <Notice kind="error">{error}</Notice> : null}

        <Button type="submit" tone="accent" block disabled={busy}>
          {busy ? 'секунду…' : isRegister ? 'Создать аккаунт' : 'Войти'}
        </Button>

        <Link
          to={`${isRegister ? '/login' : '/register'}?next=${encodeURIComponent(next)}`}
          className="text-ink-soft hover:text-accent text-center text-[11px] font-bold tracking-[0.2em] uppercase"
        >
          {isRegister ? 'уже есть аккаунт → войти' : 'нет аккаунта → регистрация'}
        </Link>
      </form>
    </div>
  )
}

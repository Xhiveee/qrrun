import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { Backdrop } from './Backdrop.tsx'
import { Logo } from './Logo.tsx'

function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase">
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
        <rect width="8" height="8" fill={connected ? '#FF3B14' : '#8A857A'}>
          {connected ? (
            <animate attributeName="opacity" values="1;0.2;1" dur="1.3s" repeatCount="indefinite" />
          ) : null}
        </rect>
      </svg>
      {connected ? 'live' : 'off'}
    </span>
  )
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
    isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10'
  }`

export function Layout({ connected }: { connected: boolean }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <Backdrop />

      <header className="border-ink bg-paper/85 sticky top-0 z-40 border-b-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="display text-xl">QRUSH</span>
          </NavLink>

          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/" className={linkClass} end>
              Лидеры
            </NavLink>
            <NavLink to="/play" className={linkClass}>
              Сканировать
            </NavLink>
            {user?.isAdmin ? (
              <NavLink to="/admin" className={linkClass}>
                Админка
              </NavLink>
            ) : null}
          </nav>

          <div className="border-ink/20 ml-2 flex items-center gap-3 border-l pl-3">
            <LiveDot connected={connected} />
            {user ? (
              <button
                onClick={logout}
                className="hover:text-accent cursor-pointer text-[11px] font-bold tracking-[0.16em] uppercase"
                title="Выйти"
              >
                {user.username} ×
              </button>
            ) : (
              <NavLink
                to={`/login?next=${encodeURIComponent(pathname)}`}
                className="bg-accent text-paper px-3 py-1.5 text-[11px] font-bold tracking-[0.2em] uppercase"
              >
                Войти
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-ink mt-16 border-t-2">
        <div className="text-ink-soft mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[10px] font-bold tracking-[0.24em] uppercase">
          <span>QRUSH · Event Scanning Race</span>
          <span>Bun · Elysia · React · SQLite</span>
        </div>
      </footer>
    </div>
  )
}

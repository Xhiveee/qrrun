import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { Button } from './components/Ui.tsx'
import { useLive } from './lib/live.ts'
import { Admin } from './pages/Admin.tsx'
import { Auth } from './pages/Auth.tsx'
import { Home } from './pages/Home.tsx'
import { Play } from './pages/Play.tsx'
import { Print } from './pages/Print.tsx'
import { ScanLanding } from './pages/ScanLanding.tsx'

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="display text-accent text-[clamp(4rem,20vw,9rem)]">404</h1>
      <p className="text-ink-soft mt-3 text-sm font-bold tracking-[0.2em] uppercase">страница не найдена</p>
      <Link to="/" className="mt-7 inline-block">
        <Button tone="accent">На главную</Button>
      </Link>
    </div>
  )
}

export function App() {
  const { event, leaderboard, connected } = useLive()

  return (
    <Routes>
      <Route path="/admin/print" element={<Print />} />
      <Route element={<Layout connected={connected} />}>
        <Route index element={<Home event={event} leaderboard={leaderboard} />} />
        <Route path="play" element={<Play event={event} leaderboard={leaderboard} />} />
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="register" element={<Auth mode="register" />} />
        <Route path="admin" element={<Admin liveEvent={event} />} />
        <Route path="s/:token" element={<ScanLanding />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

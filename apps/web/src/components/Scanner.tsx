import jsQR from 'jsqr'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Notice } from './Ui.tsx'

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

type DetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike

async function createDetector(): Promise<BarcodeDetectorLike | null> {
  const ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
  if (!ctor) return null
  try {
    return new ctor({ formats: ['qr_code'] })
  } catch {
    return null
  }
}

/**
 * Сканер камеры: нативный BarcodeDetector там, где он есть (Android/Chrome),
 * иначе — программное распознавание jsQR по кадрам с canvas.
 */
export function Scanner({
  onCode,
  disabled = false,
}: {
  onCode: (code: string) => void
  disabled?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const rafRef = useRef<number>(0)

  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emit = useCallback(
    (value: string) => {
      const now = Date.now()
      if (lastRef.current.code === value && now - lastRef.current.at < 3000) return
      lastRef.current = { code: value, at: now }
      onCode(value)
    },
    [onCode],
  )

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Камера недоступна в этом браузере. Открой сайт по HTTPS или введи код вручную.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setActive(true)

      const detector = await createDetector()
      const canvas = canvasRef.current!
      const context = canvas.getContext('2d', { willReadFrequently: true })!

      const tick = async () => {
        if (!streamRef.current) return
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          if (detector) {
            const found = await detector.detect(video).catch(() => [])
            if (found[0]?.rawValue) emit(found[0].rawValue)
          } else {
            const size = 520
            canvas.width = size
            canvas.height = size
            const side = Math.min(video.videoWidth, video.videoHeight)
            context.drawImage(
              video,
              (video.videoWidth - side) / 2,
              (video.videoHeight - side) / 2,
              side,
              side,
              0,
              0,
              size,
              size,
            )
            const image = context.getImageData(0, 0, size, size)
            const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
            if (result?.data) emit(result.data)
          }
        }
        rafRef.current = requestAnimationFrame(() => void tick())
      }

      void tick()
    } catch {
      setError('Не удалось получить доступ к камере. Разреши доступ в настройках браузера.')
      stop()
    }
  }, [emit, stop])

  useEffect(() => stop, [stop])

  return (
    <div className="flex flex-col gap-3">
      <div className="rule bg-ink relative aspect-square w-full overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Рамка прицела и бегущая линия — чистый SVG */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
          <path d="M8 24V8h16M76 8h16v16M92 76v16H76M24 92H8V76" fill="none" stroke="#F2F0E9" strokeWidth="2" />
          <rect
            x="8"
            y="8"
            width="84"
            height="84"
            fill="none"
            stroke="#FF3B14"
            strokeWidth="1"
            strokeDasharray="10 6"
            className={active ? 'animate-dash' : ''}
          />
        </svg>

        {active ? (
          <div className="pointer-events-none absolute inset-x-[8%] top-0 h-[84%] overflow-hidden">
            <div className="animate-sweep bg-accent h-1 w-full shadow-[0_0_18px_4px_rgba(255,59,20,0.6)]" />
          </div>
        ) : (
          <div className="text-paper absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden>
              <rect x="6" y="6" width="16" height="16" fill="none" stroke="#F2F0E9" strokeWidth="3" />
              <rect x="38" y="6" width="16" height="16" fill="none" stroke="#F2F0E9" strokeWidth="3" />
              <rect x="6" y="38" width="16" height="16" fill="none" stroke="#F2F0E9" strokeWidth="3" />
              <rect x="38" y="38" width="6" height="6" fill="#FF3B14">
                <animate attributeName="opacity" values="1;0.1;1" dur="1.4s" repeatCount="indefinite" />
              </rect>
              <rect x="48" y="48" width="6" height="6" fill="#FF3B14" />
            </svg>
            <span className="text-[11px] font-bold tracking-[0.24em] uppercase opacity-70">
              камера выключена
            </span>
          </div>
        )}
      </div>

      {error ? <Notice kind="error">{error}</Notice> : null}

      <Button tone={active ? 'ghost' : 'accent'} block disabled={disabled} onClick={active ? stop : () => void start()}>
        {active ? 'Остановить камеру' : 'Включить камеру'}
      </Button>
    </div>
  )
}

/**
 * Фон целиком на SVG: типографская сетка, дрейфующие модули QR и
 * медленно вращающееся кольцо. Никаких растровых изображений.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 800">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#0A0A0A" strokeOpacity="0.07" strokeWidth="1" />
          </pattern>
          <pattern id="dots" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2" fill="#0A0A0A" fillOpacity="0.09" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2F0E9" stopOpacity="0" />
            <stop offset="100%" stopColor="#F2F0E9" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <rect width="1200" height="800" fill="#F2F0E9" />
        <g className="animate-drift">
          <rect x="-100" y="-100" width="1400" height="1000" fill="url(#grid)" />
          <rect x="-100" y="-100" width="1400" height="1000" fill="url(#dots)" />
        </g>

        {/* Крупные геометрические модули — «пиксели» QR-кода */}
        <g opacity="0.85">
          <rect x="60" y="600" width="110" height="110" fill="#FF3B14" opacity="0.12">
            <animate attributeName="y" values="600;570;600" dur="9s" repeatCount="indefinite" />
          </rect>
          <rect x="1000" y="90" width="150" height="150" fill="#0A0A0A" opacity="0.06">
            <animate attributeName="x" values="1000;1030;1000" dur="12s" repeatCount="indefinite" />
          </rect>
          <rect x="880" y="620" width="70" height="70" fill="#1B3BFF" opacity="0.1">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 915 655"
              to="90 915 655"
              dur="16s"
              repeatCount="indefinite"
            />
          </rect>
        </g>

        <circle
          cx="600"
          cy="400"
          r="290"
          fill="none"
          stroke="#0A0A0A"
          strokeOpacity="0.12"
          strokeWidth="1.5"
          strokeDasharray="6 14"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 600 400"
            to="360 600 400"
            dur="70s"
            repeatCount="indefinite"
          />
        </circle>

        <rect y="620" width="1200" height="180" fill="url(#fade)" />
      </svg>
    </div>
  )
}

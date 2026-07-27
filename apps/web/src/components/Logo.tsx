export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="QRUSH">
      <rect width="32" height="32" fill="#0A0A0A" />
      <rect x="5" y="5" width="9" height="9" fill="#F2F0E9">
        <animate attributeName="fill" values="#F2F0E9;#FF3B14;#F2F0E9" dur="4s" repeatCount="indefinite" />
      </rect>
      <rect x="18" y="5" width="9" height="9" fill="#FF3B14" />
      <rect x="5" y="18" width="9" height="9" fill="#FF3B14" />
      <rect x="18" y="18" width="4" height="4" fill="#F2F0E9" />
      <rect x="23" y="23" width="4" height="4" fill="#F2F0E9">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}

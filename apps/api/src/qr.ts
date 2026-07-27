import QRCode from 'qrcode'
import { env } from './env.ts'

export function qrUrl(token: string): string {
  return `${env.publicUrl}/s/${token}`
}

/**
 * Возвращает чистый SVG без растровых изображений — его можно печатать
 * в любом размере без потери качества.
 */
export function qrSvg(token: string): Promise<string> {
  return QRCode.toString(qrUrl(token), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#000000', light: '#00000000' },
  })
}

export async function qrSvgBatch(tokens: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(tokens.map(async (token) => [token, await qrSvg(token)] as const))
  return Object.fromEntries(entries)
}

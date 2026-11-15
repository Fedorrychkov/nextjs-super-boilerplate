import qrcode from 'qrcode-generator'

export type QrCells = { count: number; path: string }

/**
 * QR modules as one SVG path, built in the browser. A QR payload can be a secret (the TOTP
 * `otpauth://` URL carries the MFA seed), so it is never sent to a third-party image service.
 */
export function buildQrPath(text: string): QrCells {
  const qr = qrcode(0, 'M')

  qr.addData(text)
  qr.make()

  const count = qr.getModuleCount()
  let path = ''

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
    }
  }

  return { count, path }
}

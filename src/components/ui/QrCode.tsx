'use client'

import { useEffect, useState } from 'react'

import type { QrCells } from '~/lib/qr/qrPath'

type QrCodeProps = {
  /** Encoded as is. May be a secret: it never leaves the browser. */
  text: string
  label: string
  size?: number
  className?: string
}

/** QR code drawn locally; the library loads lazily, only when a code is on screen. */
export const QrCode = ({ text, label, size = 200, className }: QrCodeProps) => {
  const [cells, setCells] = useState<QrCells | null>(null)

  useEffect(() => {
    let cancelled = false

    void import('~/lib/qr/qrPath').then(({ buildQrPath }) => {
      if (!cancelled) setCells(buildQrPath(text))
    })

    return () => {
      cancelled = true
    }
  }, [text])

  // A quiet zone of two modules: without it a phone camera in dark mode loses the code's edges.
  return (
    <div className={`flex items-center justify-center rounded border bg-white p-2 ${className ?? ''}`} style={{ width: size, height: size }}>
      {cells && (
        <svg role="img" aria-label={label} viewBox={`-2 -2 ${cells.count + 4} ${cells.count + 4}`} width="100%" height="100%" shapeRendering="crispEdges">
          <path d={cells.path} fill="#000" />
        </svg>
      )}
    </div>
  )
}

/** Lightweight browser/OS label from User-Agent (no external deps). */
export function buildDeviceLabel(userAgent?: string | null): string {
  const ua = (userAgent ?? '').trim()

  if (!ua) {
    return 'Unknown device'
  }

  let browser = 'Browser'
  let os = 'Unknown OS'

  if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'
  else if (/Opera|OPR\//i.test(ua)) browser = 'Opera'

  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  return `${browser} · ${os}`
}

export function maskIpForUser(ip?: string | null): string | null {
  if (!ip?.trim()) {
    return null
  }

  if (ip.includes(':')) {
    return 'IPv6'
  }

  const parts = ip.split('.')

  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`
  }

  return ip
}

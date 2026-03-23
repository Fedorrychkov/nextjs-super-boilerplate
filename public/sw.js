// Lightweight Service Worker for Web Push notifications + basic offline support

const STATIC_CACHE = 'static-v1'
const HTML_CACHE = 'html-v1'
const API_PUBLIC_CACHE = 'api-public-v1'

// Shell-pages, for precache (можно расширить под свой проект)
const PRECACHE_URLS = ['/',]

self.addEventListener('push', (event) => {
	let payload

	try {
		payload = event.data ? event.data.json() : null
    } catch {
		payload = null
	}

	if (!payload) {
		payload = { title: 'Notification', body: 'New event', url: '/' }
	}

	const title = payload.title || 'Notification'
	
	// Create a unique tag for accumulating notifications
	const uniqueTag = payload.tag ? `${payload.tag}:${Date.now()}` : `notification:${Date.now()}`
	
	const options = {
		body: payload.body,
		icon: payload.icon || '/vercel.svg',
		badge: payload.badge || '/vercel.svg',
		tag: uniqueTag, //  Unique tag for each notification
		data: {
			url: payload.url || '/',
			dedupId: payload.dedupId,
			ts: payload.ts || Date.now(),
		},
		renotify: true, // Enable repeated notifications
		// Sound options for system notifications
		silent: false, // Enable sound
		requireInteraction: false, // Require interaction
		vibrate: [200, 100, 200], // More noticeable vibration
		timestamp: payload.ts || Date.now(),
		// Additional options for sound
		actions: [], // Empty array of actions
	}
	
	event.waitUntil(
		self.registration.showNotification(title, options)
			.then(() => {
				console.info('[SW] Notification shown successfully')
				
				// Notify all open tabs about the new notification for sound playback
				self.clients.matchAll({ type: 'window', includeUncontrolled: true })
					.then(clients => {
						clients.forEach(client => {
							client.postMessage({
								type: 'NOTIFICATION_RECEIVED',
								payload: payload,
								timestamp: Date.now()
							})
						})
					})
					.catch(e => console.error('[SW] Failed to notify clients:', e))
			})
			.catch((error) => {
				console.error('[SW] Failed to show notification:', error)
			})
	)
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()
	const url = event.notification?.data?.url || '/'

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				try {
					const clientUrl = new URL(client.url)
					if (clientUrl.pathname === url || clientUrl.href === url) {
						return client.focus()
					}
				} catch {}
			}
			return clients.openWindow(url)
		})
	)
})

self.addEventListener('install', (event) => {
	self.skipWaiting()

	event.waitUntil(
		caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
	)
})

self.addEventListener('activate', (event) => {
	event.waitUntil(
		Promise.all([
			self.clients.claim(),
			caches.keys().then((keys) =>
				Promise.all(
					keys
						.filter((key) => ![STATIC_CACHE, HTML_CACHE, API_PUBLIC_CACHE].includes(key))
						.map((key) => caches.delete(key))
				)
			),
		])
	)
})

// Offline: try to handle requests
self.addEventListener('fetch', (event) => {
	const request = event.request
	const url = new URL(request.url)

	// Ignore requests with unsupported schemes (chrome-extension:, moz-extension: and etc.)
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return
	}

	// Only GET requests
	if (request.method !== 'GET') {
		return
	}

	const isLocalhost =
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1'

  // In localhost, we don't touch _next at all
  if (isLocalhost && url.pathname.startsWith('/_next/')) {
    return
  }

	// Next static assets и ассеты — cache-first
	if (
		url.pathname.startsWith('/_next/static/') ||
		url.pathname.startsWith('/_next/image') ||
		url.pathname.startsWith('/favicon') ||
		url.pathname.startsWith('/icons') ||
		url.pathname.endsWith('.css') ||
		url.pathname.endsWith('.js') ||
		/**
		 * Images from ucarecdn.com are cached by default
		 */
		url.hostname.includes('ucarecdn.com')
	) {
		event.respondWith(cacheFirst(request))

		return
	}

	// Public API (example: articles) — network-first with fallback in cache
	if (url.pathname.startsWith('/api/v1/public/')) {
		event.respondWith(networkFirstApi(request))

		return
	}

	// HTML pages (SSR/SPA routes) — network-first with fallback in cache
	if (request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(networkFirstHtml(request))
	}
})

async function cacheFirst(request) {
	const cache = await caches.open(STATIC_CACHE)
	const cached = await cache.match(request)

	if (cached) {
		return cached
	}

	const response = await fetch(request)

	if (response && response.ok) {
		cache.put(request, response.clone())
	}

	return response
}

async function networkFirstHtml(request) {
	const cache = await caches.open(HTML_CACHE)

	try {
		const response = await fetch(request)

		if (response && response.ok) {
			cache.put(request, response.clone())
		}

		return response
	} catch {
		const cached = await cache.match(request)

		if (cached) {
			return cached
		}

		return new Response('You are offline', {
			status: 503,
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		})
	}
}

async function networkFirstApi(request) {
	const cache = await caches.open(API_PUBLIC_CACHE)

	try {
		const response = await fetch(request)

		if (response && response.ok) {
			cache.put(request, response.clone())
		}

		return response
	} catch {
		const cached = await cache.match(request)

		if (cached) {
			return cached
		}

		return new Response(
			JSON.stringify({ error: 'offline', message: 'No network connection and no cached response' }),
			{
				status: 503,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			}
		)
	}
}

// Lightweight Service Worker for Web Push notifications

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

self.addEventListener('install', () => {
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})

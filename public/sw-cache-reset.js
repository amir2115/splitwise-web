/* global caches, self */
const PWA_CACHE_RESET_VERSION = '2026-05-redesign-v1'
const CURRENT_CACHE_PREFIX = 'dongino-web-2026-05-redesign'
const CURRENT_RUNTIME_CACHES = new Set(['dongino-api-runtime-cache-v2'])

function isCurrentCache(cacheName) {
  return cacheName.startsWith(CURRENT_CACHE_PREFIX) || CURRENT_RUNTIME_CACHES.has(cacheName)
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (isCurrentCache(cacheName)) return undefined
          return caches.delete(cacheName)
        }),
      )

      await self.clients.claim()
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      await Promise.all(
        clients.map(async (client) => {
          client.postMessage({ type: 'PWA_CACHE_RESET_COMPLETE', version: PWA_CACHE_RESET_VERSION })
          if ('navigate' in client && client.url.startsWith(self.location.origin)) {
            await client.navigate(client.url)
          }
        }),
      )
    })(),
  )
})

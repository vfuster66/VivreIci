const VERSION = "vivreici-v1"
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`

const APP_SHELL_ROUTES = [
  "/",
  "/carte",
  "/signalements",
  "/signalements/nouveau",
  "/notifications",
  "/profil",
  "/entraide",
  "/alertes",
  "/connexion",
  "/inscription",
  "/confidentialite",
  "/offline.html",
  "/manifest.json",
  "/logos/7.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ROUTES))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

async function cacheResponse(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type === "error") {
    return response
  }

  const cache = await caches.open(cacheName)
  cache.put(request, response.clone())
  return response
}

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          return await cacheResponse(RUNTIME_CACHE, request, response)
        } catch {
          const cachedResponse =
            (await caches.match(request)) ||
            (url.origin === self.location.origin
              ? await caches.match(url.pathname)
              : null)

          return cachedResponse || caches.match("/offline.html")
        }
      })()
    )
    return
  }

  if (url.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request)

      if (cachedResponse) {
        void fetch(request)
          .then((response) => cacheResponse(RUNTIME_CACHE, request, response))
          .catch(() => undefined)

        return cachedResponse
      }

      try {
        const response = await fetch(request)
        return await cacheResponse(RUNTIME_CACHE, request, response)
      } catch {
        return (
          (await caches.match(request)) ||
          (request.destination === "document"
            ? caches.match("/offline.html")
            : Response.error())
        )
      }
    })()
  )
})

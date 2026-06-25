const CACHE_NAME = 'geqo-admin-v2';
const urlsToCache = [
    '/',
    '/static/index.html',
    '/static/manifest.json'
    // NOTE: External CDN assets are NOT cached due to supply-chain security risks.
    // Bundle critical dependencies locally or use Subresource Integrity (SRI) with CSP headers.
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch event with network-first for APIs and cache-first for local assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first for API calls and external resources
    if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for local assets
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

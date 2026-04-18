// ============================================
// SeatSync Service Worker — Phase 6
// Cache Strategy: Cache-first for assets, Network-first for API
// ============================================

const CACHE_VERSION = 'seatsync-v2.1.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets to cache on install
// Auto-detect base path (works for root and GitHub Pages subpath like /seatsync/)
const BASE_PATH = self.location.pathname.replace('/sw.js', '');

const STATIC_ASSETS = [
  BASE_PATH + '/',
  BASE_PATH + '/app.html',
  BASE_PATH + '/rsvp.html',
  BASE_PATH + '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@600;700;800&display=swap',
];

// Never cache these
const BYPASS_PATTERNS = [
  /supabase\.co/,       // Supabase API — always fresh
  /unpkg\.com/,         // CDN scripts — cache handled separately
  /fonts\.gstatic\.com/, // Font files — browser caches
];

// ── Install ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http') || url.includes('fonts')));
    }).catch(err => console.warn('[SW] Cache install partial:', err))
  );
  self.skipWaiting();
});

// ── Activate — clean old caches ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls — always network
  if (BYPASS_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(fetchWithFallback(request));
    return;
  }

  // HTML navigation — Network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/app.html')))
    );
    return;
  }

  // Static assets — Cache first, then network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Return offline placeholder for images
        if (request.destination === 'image') {
          return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#eee"/></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
        }
      });
    })
  );
});

async function fetchWithFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── Background sync placeholder (future) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-guest-status') {
    console.log('[SW] Background sync:', event.tag);
  }
});

// ── Push notifications placeholder (future) ──
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'SeatSync', {
      body: data.body || 'עדכון חדש',
      icon: '/icon-192.png',
      dir: 'rtl',
      lang: 'he',
    })
  );
});

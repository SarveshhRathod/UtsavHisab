const CACHE_NAME = 'utsavhisab-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/income.html',
    '/expense.html',
    '/receipts.html',
    '/reports.html',
    '/members.html',
    '/donors.html',
    '/settings.html',
    '/css/style.css',
    '/css/responsive.css',
    '/js/supabase.js',
    '/js/auth.js',
    '/js/utils.js',
    '/js/offline.js',
    '/js/dashboard.js',
    '/js/income.js',
    '/js/receipts.js',
    '/js/reports.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Only cache GET requests for static assets, bypass Supabase API calls
    if (e.request.url.includes('supabase.co')) {
        return;
    }
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});

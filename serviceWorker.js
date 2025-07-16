const cacheName = 'treasure-hunt-app';
const filesToCache = [
    '/',
    'Index.html',
    'app.html',
    'Test.html',
    'Cookies.js',
    'geolocation.js',
    'API.js',
    'Styling.css',
    "main.js"
];
//Start the service worker and cache all of the app's content.
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(filesToCache);
        })
    );
});
//Define which content to retrieve when the app is offline.
self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        })
    );
});
const VERSION = "2034d23aaae25923";
const PRECACHE = ["./assets/FBXLoader-mHXfKLW0.js","./assets/OBJLoader-BvFHhtRL.js","./assets/PLYLoader-B6qIxrVb.js","./assets/STLLoader-SszGQsGG.js","./assets/app-2Noj5ToL.js","./assets/app-bQ0ueoVL.css","./assets/draco_decoder-C32yEggz.wasm","./assets/draco_decoder-Z1_iN-Ht.wasm","./assets/draco_decoder-fzg4nYZr.js","./assets/draco_wasm_wrapper-DxJM36Ib.js","./assets/draco_wasm_wrapper-fZCQGLGb.js","./decoders/draco/LICENSE","./decoders/draco/README.md","./decoders/draco/draco_decoder.js","./decoders/draco/draco_decoder.wasm","./decoders/draco/draco_wasm_wrapper.js","./favicon.svg","./icons/app-192.png","./icons/app-512.png","./icons/app-maskable-512.png","./icons/apple-touch-icon.png","./icons/notes-192.png","./icons/notes-512.png","./icons/notes-apple-touch-icon.png","./icons/notes-maskable-512.png","./icons/notes.svg","./index.html","./manifest.webmanifest","./notes.html","./notes.webmanifest"];
/* VERSION and PRECACHE are injected by the shared web build. */
const APP_ROOT = new URL('./', self.location.href);
const PREFIX = 'mindspace-shell-' + encodeURIComponent(APP_ROOT.pathname) + '-';
const CACHE = PREFIX + VERSION;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(PRECACHE.map(file => new URL(file, APP_ROOT).href)); }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Keep the preceding build for tabs which still use its lazy-loaded modules.
    const old = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE);
    await Promise.all(old.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'APPLY_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== APP_ROOT.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;
  if (event.request.mode === 'navigate') {
    // Keep each installed app's manifest and startup view when it opens offline.
    const entry = url.pathname === new URL('notes.html', APP_ROOT).pathname ? 'notes.html' : 'index.html';
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(new URL(entry, APP_ROOT).href)) || fetch(event.request)));
    return;
  }
  event.respondWith((async () => {
    const current = await caches.open(CACHE);
    // These are bundled same-origin static files; dev/static hosts may add Vary: Origin.
    const response = await current.match(event.request, { ignoreSearch: true, ignoreVary: true }) || await caches.match(event.request, { ignoreVary: true });
    if (!response) return fetch(event.request);
    const range = event.request.headers.get('range')?.match(/^bytes=(\d+)-(\d*)$/);
    if (!range) return response;
    const blob = await response.blob(), start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), blob.size - 1) : blob.size - 1;
    if (start > end || start >= blob.size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + blob.size } });
    return new Response(blob.slice(start, end + 1, blob.type), { status: 206, headers: {
      'Content-Type': blob.type, 'Content-Range': 'bytes ' + start + '-' + end + '/' + blob.size,
      'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes',
    } });
  })());
});

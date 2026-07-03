// シンプルな Service Worker。
// - アプリシェル（各ページのHTML）と静的アセットをキャッシュし、オフラインでも問題演習が動くようにする。
// - ナビゲーション：ネットワーク優先→失敗時キャッシュ。
// - 静的アセット（_next / icons など）：キャッシュ優先＋ランタイムキャッシュ。

const VERSION = "v1";
const CACHE = `nsca-cpt-${VERSION}`;

// 事前キャッシュするナビゲーション（trailingSlash: true 構成に合わせる）。
const PRECACHE_URLS = [
  "/",
  "/practice/",
  "/mock/",
  "/stats/",
  "/review/",
  "/settings/",
  "/about/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // 個別に失敗しても install を止めないよう寛容に追加する。
      Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ページ遷移：ネットワーク優先、失敗時にキャッシュ（無ければトップ）。
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // 静的アセット：キャッシュ優先、無ければ取得してキャッシュ。
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      });
    }),
  );
});

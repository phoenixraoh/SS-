const CACHE_NAME = 'calendar-app-v7';
const urlsToCache = [
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    // アイコン画像もキャッシュに含める
    './images/icon-192x192.png',
    './images/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;
    
    // chrome-extension:// や file:// などのサポートされていないスキームを除外
    if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
        return; // これらのリクエストは通常の処理を通さない
    }
    
    // favicon.icoなどの特定のリクエストはスキップ（存在しない場合にエラーになるため）
    try {
        const urlPath = new URL(requestUrl).pathname;
        if (urlPath.includes('favicon.ico') || urlPath.includes('favicon')) {
            return; // 通常の処理に戻す（service-workerを介さない）
        }
    } catch (e) {
        // URL解析に失敗した場合は、文字列検索で判定
        if (requestUrl.includes('favicon.ico') || requestUrl.includes('favicon')) {
            return;
        }
    }
    
    // リクエストがキャッシュ可能かどうかをチェックする関数
    const canCache = (request) => {
        try {
            const url = request.url;
            return url && (url.startsWith('http://') || url.startsWith('https://'));
        } catch (e) {
            return false;
        }
    };
    
    // 安全にfetchする関数
    event.respondWith(
        (async () => {
            try {
                // まずネットワークから取得を試みる
                const response = await fetch(event.request);
                
                // ネットワークから取得できた場合は、キャッシュを更新してから返す
                if (response && 
                    response.status === 200 && 
                    response.type === 'basic' &&
                    canCache(event.request)) {
                    const responseToCache = response.clone();
                    
                    // 非同期でキャッシュに保存（エラーが発生しても応答には影響しない）
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            if (canCache(event.request)) {
                                return cache.put(event.request, responseToCache);
                            }
                        })
                        .catch(() => {
                            // エラーは無視
                        });
                }
                return response;
            } catch (error) {
                // ネットワークから取得できなかった場合、キャッシュから取得を試みる
                try {
                    const cachedResponse = await caches.match(event.request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                } catch (cacheError) {
                    // キャッシュの取得も失敗した場合
                }
                
                // キャッシュにも存在しない場合は、404レスポンスを返す
                return new Response('', {
                    status: 404,
                    statusText: 'Not Found',
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })()
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // 古いキャッシュを削除
                    }
                })
            );
        })
    );
});

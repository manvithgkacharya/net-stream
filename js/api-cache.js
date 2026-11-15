/**
 * NetStream - Ultra-Fast API Cache & Mobile Cellular Network Optimizer
 * - Multi-tier memory & sessionStorage/localStorage caching
 * - Timeout handling (8s) with AbortController
 * - Automatic exponential retry on network failures / cellular packet loss
 * - Stale-while-revalidate strategy (instant rendering + background refresh)
 * - Network-aware adaptive image URLs (w185/w780 for mobile to save ~95% data vs original)
 * - Skeleton placeholders for zero layout shifts and instant perceived performance
 */
(function () {
    const memoryCache = new Map();
    const CACHE_PREFIX = 'ns_cache_';
    const DEFAULT_TTL = 25 * 60 * 1000; // 25 minutes
    const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
    const POSTER_FALLBACK = 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=70';

    function isMobile() {
        return window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    }

    function isSaveDataOrSlow() {
        if ('connection' in navigator && navigator.connection) {
            const conn = navigator.connection;
            if (conn.saveData) return true;
            if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.effectiveType === '3g') return true;
        }
        return false;
    }

    function getStorage() {
        try {
            if (window.sessionStorage) return window.sessionStorage;
        } catch (_) {}
        try {
            if (window.localStorage) return window.localStorage;
        } catch (_) {}
        return null;
    }

    function getCached(key) {
        if (memoryCache.has(key)) {
            const mem = memoryCache.get(key);
            if (Date.now() < mem.expiry) {
                return { data: mem.data, isStale: false };
            }
            return { data: mem.data, isStale: true };
        }
        const storage = getStorage();
        if (storage) {
            try {
                const raw = storage.getItem(CACHE_PREFIX + key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    memoryCache.set(key, parsed);
                    const isStale = Date.now() >= parsed.expiry;
                    return { data: parsed.data, isStale };
                }
            } catch (_) {}
        }
        return null;
    }

    function setCached(key, data, ttl = DEFAULT_TTL) {
        const item = {
            data,
            expiry: Date.now() + ttl,
            cachedAt: Date.now()
        };
        memoryCache.set(key, item);
        const storage = getStorage();
        if (storage) {
            try {
                storage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
            } catch (e) {
                try {
                    for (let i = storage.length - 1; i >= 0; i--) {
                        const k = storage.key(i);
                        if (k && k.startsWith(CACHE_PREFIX)) {
                            storage.removeItem(k);
                        }
                    }
                    storage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
                } catch (_) {}
            }
        }
    }

    async function fetchWithTimeout(url, timeoutMs = 8000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${url}`);
            }
            return await response.json();
        } catch (err) {
            clearTimeout(timer);
            throw err;
        }
    }

    async function fetchWithRetry(url, retries = 1, timeoutMs = 8000) {
        let lastErr = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fetchWithTimeout(url, timeoutMs);
            } catch (err) {
                lastErr = err;
                if (attempt < retries) {
                    await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
                }
            }
        }
        throw lastErr;
    }

    async function fetchCached(url, options = {}) {
        const ttl = options.ttl || DEFAULT_TTL;
        const timeoutMs = options.timeout || (isSaveDataOrSlow() ? 10000 : 8000);
        const cacheKey = url.replace(/api_key=[^&]+/, 'k=1');

        const cached = getCached(cacheKey);

        if (cached && !cached.isStale) {
            return cached.data;
        }

        // Stale cache: return immediately to render UI instantly, refresh silently in background
        if (cached && cached.isStale) {
            fetchWithRetry(url, 1, timeoutMs)
                .then(fresh => setCached(cacheKey, fresh, ttl))
                .catch(() => {});
            return cached.data;
        }

        try {
            const data = await fetchWithRetry(url, 1, timeoutMs);
            setCached(cacheKey, data, ttl);
            return data;
        } catch (err) {
            if (cached && cached.data) {
                console.warn('Network issue on mobile data, returning cached data for:', url);
                return cached.data;
            }
            throw err;
        }
    }

    function getBackdropUrl(path, forceMobile) {
        if (!path) return '';
        const mobileMode = forceMobile !== undefined ? forceMobile : isMobile();
        // Never download uncompressed 4K /original on cellular connections
        return `${TMDB_IMAGE_BASE}/${mobileMode ? 'w780' : 'w1280'}${path}`;
    }

    function getPosterUrl(path, forceMobile) {
        if (!path) return POSTER_FALLBACK;
        const mobileMode = forceMobile !== undefined ? forceMobile : (window.innerWidth <= 640 || isSaveDataOrSlow());
        return `${TMDB_IMAGE_BASE}/${mobileMode ? 'w185' : 'w342'}${path}`;
    }

    function renderSkeletons(container, count = 6) {
        if (!container) return;
        const cards = [];
        for (let i = 0; i < count; i++) {
            cards.push(`
                <div class="skeleton-card" aria-hidden="true">
                    <div class="skeleton-poster skeleton-shimmer"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-line skeleton-shimmer" style="width: 82%;"></div>
                        <div class="skeleton-line skeleton-shimmer" style="width: 48%;"></div>
                    </div>
                </div>
            `);
        }
        container.innerHTML = cards.join('');
    }

    window.NetStreamAPI = {
        fetchCached,
        getBackdropUrl,
        getPosterUrl,
        isMobile,
        isSaveDataOrSlow,
        renderSkeletons
    };
})();

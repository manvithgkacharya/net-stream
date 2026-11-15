/**
 * NetStream - Watch History & Continue Watching Manager
 * Tracks watched movies & TV series across sessions and renders the Continue Watching shelf.
 */
(function() {
    const STORAGE_KEY = 'netstream_watch_history';
    const MAX_HISTORY_ITEMS = 30;
    const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
    const BACKDROP_FALLBACK = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=70';

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
        } catch (e) {
            console.error('Error reading watch history:', e);
            return [];
        }
    }

    function saveHistory(list) {
        try {
            const trimmed = list.slice(0, MAX_HISTORY_ITEMS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch (e) {
            console.error('Error saving watch history:', e);
        }
    }

    function formatTimeRemaining(currentTime, duration) {
        if (!duration || duration <= 0 || !currentTime) return null;
        const remaining = Math.max(0, duration - currentTime);
        const mins = Math.round(remaining / 60);
        if (mins < 1) return 'Almost finished';
        if (mins < 60) return `${mins}m left`;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return remMins > 0 ? `${hrs}h ${remMins}m left` : `${hrs}h left`;
    }

    function recordWatch(item) {
        if (!item || !item.id) return;
        const id = String(item.id);
        const mediaType = item.mediaType === 'tv' ? 'tv' : 'movie';
        const list = getHistory();

        const existingIdx = list.findIndex(h => String(h.id) === id && h.mediaType === mediaType);
        const existing = existingIdx !== -1 ? list[existingIdx] : {};

        const progressPercent = typeof item.progress === 'number'
            ? item.progress
            : (item.duration && item.currentTime ? (item.currentTime / item.duration) * 100 : (existing.progress || 0));

        const updated = {
            id: Number(id) || id,
            mediaType,
            title: item.title || existing.title || (mediaType === 'tv' ? 'TV Show' : 'Movie'),
            backdrop_path: item.backdrop_path !== undefined ? item.backdrop_path : existing.backdrop_path,
            poster_path: item.poster_path !== undefined ? item.poster_path : existing.poster_path,
            overview: item.overview || existing.overview || '',
            vote_average: item.vote_average !== undefined ? item.vote_average : existing.vote_average,
            vote_count: item.vote_count !== undefined ? item.vote_count : existing.vote_count,
            season: item.season !== undefined ? item.season : (existing.season || 1),
            episode: item.episode !== undefined ? item.episode : (existing.episode || 1),
            currentTime: typeof item.currentTime === 'number' ? item.currentTime : (existing.currentTime || 0),
            duration: typeof item.duration === 'number' ? item.duration : (existing.duration || 0),
            progress: Math.min(100, Math.max(0, progressPercent)),
            lastWatched: Date.now()
        };

        if (existingIdx !== -1) {
            list.splice(existingIdx, 1);
        }
        list.unshift(updated);
        saveHistory(list);

        // Keep single-title progress key synced for Vidstuck embed resume
        try {
            const singleKey = mediaType === 'tv' ? `netstream_progress_tv_${id}` : `netstream_progress_movie_${id}`;
            const progressPayload = {
                id: updated.id,
                mediaType,
                currentTime: updated.currentTime,
                duration: updated.duration,
                progress: updated.progress,
                season: updated.season,
                episode: updated.episode,
                title: updated.title,
                timestamp: updated.lastWatched
            };
            localStorage.setItem(singleKey, JSON.stringify(progressPayload));

            if (mediaType === 'tv') {
                const epKey = `netstream_progress_tv_${id}_${updated.season}_${updated.episode}`;
                localStorage.setItem(epKey, JSON.stringify(progressPayload));
            }
        } catch (_) {}

        syncAllShelves();
    }

    function updateProgress(id, mediaType, data) {
        if (!id) return;
        const strId = String(id);
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        const list = getHistory();
        const existingIdx = list.findIndex(h => String(h.id) === strId && h.mediaType === type);

        const currentTime = typeof data.currentTime === 'number' ? data.currentTime : (typeof data.timestamp === 'number' ? data.timestamp : 0);
        const duration = typeof data.duration === 'number' ? data.duration : 0;
        const progress = typeof data.progress === 'number'
            ? data.progress
            : (duration > 0 ? (currentTime / duration) * 100 : 0);

        if (existingIdx !== -1) {
            const item = list[existingIdx];
            item.currentTime = currentTime;
            if (duration > 0) item.duration = duration;
            item.progress = Math.min(100, Math.max(0, progress));
            if (data.season) item.season = data.season;
            if (data.episode) item.episode = data.episode;
            if (data.title && (!item.title || item.title === 'Movie' || item.title === 'TV Show')) {
                item.title = data.title;
            }
            item.lastWatched = Date.now();
            list.splice(existingIdx, 1);
            list.unshift(item);
            saveHistory(list);
            syncAllShelves();
        } else {
            recordWatch({
                id,
                mediaType: type,
                title: data.title || (type === 'tv' ? 'TV Show' : 'Movie'),
                season: data.season || 1,
                episode: data.episode || 1,
                currentTime,
                duration,
                progress
            });
        }
    }

    function removeProgressKeys(prefix) {
        try {
            const toDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix)) {
                    toDelete.push(k);
                }
            }
            toDelete.forEach(k => localStorage.removeItem(k));
        } catch (_) {}
    }

    function removeItem(id, mediaType) {
        const strId = String(id);
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        let list = getHistory();
        list = list.filter(h => !(String(h.id) === strId && h.mediaType === type));
        saveHistory(list);

        try {
            localStorage.removeItem(`netstream_progress_${type}_${strId}`);
            if (type === 'tv') {
                removeProgressKeys(`netstream_progress_tv_${strId}_`);
            }
        } catch (_) {}

        syncAllShelves();
    }

    function clearHistory() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            removeProgressKeys('netstream_progress_');
        } catch (_) {}
        syncAllShelves();
    }

    function createContinueWatchingCard(item, onPlayCallback) {
        const card = document.createElement('div');
        card.className = 'cw-card';
        card.dataset.id = item.id;
        card.dataset.type = item.mediaType;

        const isTv = item.mediaType === 'tv';
        const safeTitle = escapeHtml(item.title || (isTv ? 'TV Show' : 'Movie'));
        const backdropUrl = item.backdrop_path
            ? (window.NetStreamAPI ? NetStreamAPI.getBackdropUrl(item.backdrop_path) : `${TMDB_IMAGE_BASE}/w780${item.backdrop_path}`)
            : (item.poster_path ? (window.NetStreamAPI ? NetStreamAPI.getPosterUrl(item.poster_path) : `${TMDB_IMAGE_BASE}/w342${item.poster_path}`) : BACKDROP_FALLBACK);

        const progressPercent = Math.min(100, Math.max(0, Math.round(item.progress || 0)));
        const timeRemaining = formatTimeRemaining(item.currentTime, item.duration);
        const progressLabel = progressPercent >= 95
            ? 'Watched'
            : (timeRemaining ? timeRemaining : (progressPercent > 0 ? `${progressPercent}% watched` : 'Just started'));

        const ratingNum = Number(item.vote_average);
        const ratingVal = Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : null;

        card.innerHTML = `
            <div class="cw-thumb-wrapper">
                <img src="${backdropUrl}" alt="${safeTitle}" class="cw-thumb-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${BACKDROP_FALLBACK}'">
                <div class="cw-thumb-gradient"></div>
                <div class="cw-badge-row">
                    <span class="cw-type-badge ${isTv ? 'is-tv' : 'is-movie'}">
                        <i class="${isTv ? 'fas fa-tv' : 'fas fa-film'}"></i> ${isTv ? 'Series' : 'Movie'}
                    </span>
                    ${ratingVal ? `<span class="cw-rating-badge"><i class="fas fa-star"></i> ${ratingVal}</span>` : ''}
                </div>
                <button type="button" class="cw-remove-btn" title="Remove from Continue Watching" aria-label="Remove ${safeTitle} from watch history">
                    <i class="fas fa-times"></i>
                </button>
                <div class="cw-play-overlay">
                    <div class="cw-play-circle" title="Resume ${safeTitle}">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="cw-progress-track">
                    <div class="cw-progress-fill" style="width: ${progressPercent > 0 ? Math.max(progressPercent, 4) : 4}%;"></div>
                </div>
            </div>
            <div class="cw-meta">
                <div class="cw-meta-top">
                    <h4 class="cw-title" title="${safeTitle}">${safeTitle}</h4>
                    ${isTv ? `<span class="cw-episode-pill">S${item.season || 1} : E${item.episode || 1}</span>` : ''}
                </div>
                <div class="cw-meta-bottom">
                    <span class="cw-progress-text"><i class="fas fa-clock"></i> ${escapeHtml(progressLabel)}</span>
                    <button type="button" class="cw-resume-btn" aria-label="Resume ${safeTitle}">${progressPercent >= 95 ? 'Replay' : 'Resume'}</button>
                </div>
            </div>
        `;

        const playAction = (e) => {
            if (e) e.stopPropagation();
            if (typeof onPlayCallback === 'function') {
                onPlayCallback(item);
            } else if (isTv && typeof window.playTvEpisode === 'function') {
                window.playTvEpisode(item.id, item.season || 1, item.episode || 1, item.title);
            } else if (isTv && typeof window.playTvShow === 'function') {
                window.playTvShow(item.id, 'tv', item.title);
            } else if (typeof window.playMedia === 'function') {
                window.playMedia(item.id, item.mediaType, item.title);
            }
        };

        const resumeBtn = card.querySelector('.cw-resume-btn');
        const thumbWrapper = card.querySelector('.cw-thumb-wrapper');

        if (resumeBtn) resumeBtn.addEventListener('click', playAction);
        if (thumbWrapper) thumbWrapper.addEventListener('click', playAction);

        const removeBtn = card.querySelector('.cw-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                card.classList.add('removing');
                setTimeout(() => {
                    removeItem(item.id, item.mediaType);
                }, 200);
            });
        }

        return card;
    }

    const registeredShelves = new Map();

    function renderShelf(config) {
        const { sectionId, sliderId, emptyId, clearBtnId, filterType, onPlay } = config;
        const section = document.getElementById(sectionId);
        const slider = document.getElementById(sliderId);
        const emptyState = emptyId ? document.getElementById(emptyId) : null;
        const clearBtn = clearBtnId ? document.getElementById(clearBtnId) : null;

        if (!slider) return;

        let history = getHistory();
        if (filterType && filterType !== 'all') {
            history = history.filter(h => h.mediaType === filterType);
        }

        const sliderWrapper = slider.closest('.slider-wrapper');

        if (history.length === 0) {
            slider.innerHTML = '';
            if (sliderWrapper) sliderWrapper.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            if (clearBtn) {
                clearBtn.style.display = 'none';
                clearBtn.classList.remove('confirming');
                clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> <span>Clear History</span>';
            }
            if (section && section.dataset.hideWhenEmpty === 'true') {
                section.style.display = 'none';
            }
            return;
        }

        if (section) section.style.display = 'block';
        if (sliderWrapper) sliderWrapper.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'inline-flex';

        slider.innerHTML = '';
        history.forEach(item => {
            const card = createContinueWatchingCard(item, onPlay);
            slider.appendChild(card);
        });
    }

    function registerShelf(config) {
        const id = config.sliderId;
        registeredShelves.set(id, config);
        renderShelf(config);

        if (config.clearBtnId) {
            const btn = document.getElementById(config.clearBtnId);
            if (btn && !btn.dataset.cwBound) {
                btn.dataset.cwBound = 'true';
                let resetTimer = null;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!btn.classList.contains('confirming')) {
                        btn.classList.add('confirming');
                        btn.innerHTML = '<i class="fas fa-check"></i> <span>Confirm Clear?</span>';
                        clearTimeout(resetTimer);
                        resetTimer = setTimeout(() => {
                            btn.classList.remove('confirming');
                            btn.innerHTML = '<i class="fas fa-trash-alt"></i> <span>Clear History</span>';
                        }, 3500);
                    } else {
                        clearTimeout(resetTimer);
                        btn.classList.remove('confirming');
                        btn.innerHTML = '<i class="fas fa-trash-alt"></i> <span>Clear History</span>';
                        clearHistory();
                    }
                });
            }
        }
    }

    function syncAllShelves() {
        registeredShelves.forEach((config) => {
            renderShelf(config);
        });
    }

    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY || (e.key && e.key.startsWith('netstream_progress_'))) {
            syncAllShelves();
        }
    });

    window.NetStreamHistory = {
        STORAGE_KEY,
        getHistory,
        recordWatch,
        updateProgress,
        removeItem,
        clearHistory,
        registerShelf,
        syncAllShelves
    };
})();

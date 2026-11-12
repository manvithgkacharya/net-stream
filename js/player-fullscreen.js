(function () {
    let wasNativeFullscreen = false;

    function getPlayerModal() {
        return document.getElementById('playerModal');
    }

    function getNativeFullscreenElement() {
        return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || null;
    }

    function updateFullscreenButtonState(isFullscreen) {
        const btn = document.getElementById('playerFullscreenBtn');
        if (!btn) return;
        btn.innerHTML = isFullscreen
            ? '<i class="fas fa-compress"></i> <span>Exit</span>'
            : '<i class="fas fa-expand"></i> <span>Fullscreen</span>';
        btn.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
    }

    function exitPlayerFullscreen() {
        wasNativeFullscreen = false;
        const nativeFs = getNativeFullscreenElement();
        if (nativeFs) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
        }
        const playerModal = getPlayerModal();
        if (playerModal) {
            playerModal.classList.remove('is-app-fullscreen');
        }
        updateFullscreenButtonState(false);
    }

    function handleFullscreenChange() {
        const nativeFs = getNativeFullscreenElement();
        const playerModal = getPlayerModal();
        if (nativeFs) {
            wasNativeFullscreen = true;
            updateFullscreenButtonState(true);
        } else if (wasNativeFullscreen) {
            wasNativeFullscreen = false;
            if (playerModal) {
                playerModal.classList.remove('is-app-fullscreen');
            }
            updateFullscreenButtonState(false);
        } else {
            updateFullscreenButtonState(Boolean(playerModal && playerModal.classList.contains('is-app-fullscreen')));
        }
    }

    function togglePlayerFullscreen() {
        const playerModal = getPlayerModal();
        if (!playerModal) return;

        const nativeFs = getNativeFullscreenElement();
        const isAppFs = playerModal.classList.contains('is-app-fullscreen');
        if (nativeFs || isAppFs) {
            exitPlayerFullscreen();
            return;
        }

        // Apply edge-to-edge modal fullscreen immediately so mobile Safari / restricted WebViews expand to 100vw x 100dvh
        playerModal.classList.add('is-app-fullscreen');
        updateFullscreenButtonState(true);

        const target = document.getElementById('playerContainer') || document.getElementById('vidstuckPlayer');
        if (!target) return;

        const reqFs = target.requestFullscreen || target.webkitRequestFullscreen || target.mozRequestFullScreen || target.msRequestFullscreen;
        if (reqFs) {
            try {
                const result = reqFs.call(target);
                if (result && typeof result.catch === 'function') {
                    result.catch(() => {});
                }
            } catch (_) {
                // Keep app edge-to-edge fullscreen active when native fullscreen is blocked
            }
        }
    }

    window.exitPlayerFullscreen = exitPlayerFullscreen;
    window.handleFullscreenChange = handleFullscreenChange;
    window.togglePlayerFullscreen = togglePlayerFullscreen;
})();


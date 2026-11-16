/**
 * NetStream - Advanced Video Player AdBlocker & Anti-Redirect Shield
 * - Active parent-level shielding (blocks top-navigation, popups, and focus theft)
 * - Intercepts window.open calls and rogue programmatic redirects
 * - Defends against focus-stealing popunders
 * - Blocks injected click-jacking anchors
 * - Provides live visual feedback when popups / redirects are neutralized
 */
(function () {
    let isPlayerActive = false;
    let toastTimeout = null;
    let allowedInternalNavigation = false;

    // List of known ad / tracker patterns (defense-in-depth)
    const AD_DOMAINS = [
        'popads', 'onclickpredictiv', 'adsterra', 'bet', 'casino',
        'exoclick', 'propellerads', 'adbuffs', 'hilltopads', 'trafficjunky',
        'yandex', 'doubleclick', 'clickadu', 'syndication', 'redirect'
    ];

    function isAdUrl(url) {
        if (!url || typeof url !== 'string') return true;
        const lower = url.toLowerCase();
        return AD_DOMAINS.some(d => lower.includes(d));
    }

    // Intercept window.open in parent window context
    const nativeWindowOpen = window.open;
    window.open = function (url, target, features) {
        if (isPlayerActive) {
            console.warn('[NetStream AdBlocker] Neutralized window.open popup attempt:', url);
            showBlockedToast('Pop-up ad blocked');
            pulseBadge();
            return null; // Suppress popup completely
        }
        return nativeWindowOpen.apply(this, arguments);
    };

    // Protect player iframe: apply security policies & permissions
    function protectPlayerIframe(iframe) {
        if (!iframe) return;

        // Note: Do NOT set iframe 'sandbox' attribute as Vidstuck, vidsrc, and other modern
        // streaming embed providers detect HTML5 iframe sandboxing and intentionally block
        // video playback with a "Sandbox Detected" error screen.
        // Protection against popups and rogue redirects is instead enforced at the parent
        // window level via top-level beforeunload guard, window.open override, click-jacking
        // interception, and anti-popunder focus lock.
        if (typeof iframe.removeAttribute === 'function') {
            iframe.removeAttribute('sandbox');
        }

        // Permissions Policy
        iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('webkitallowfullscreen', 'true');
        iframe.setAttribute('mozallowfullscreen', 'true');

        // Referrer policy
        iframe.setAttribute('referrerpolicy', 'origin');
    }

    // Activate shield when player modal opens
    function activate() {
        isPlayerActive = true;
        document.body.classList.add('adblock-shield-active');
    }

    // Deactivate shield when player modal closes
    function deactivate() {
        isPlayerActive = false;
        document.body.classList.remove('adblock-shield-active');
    }

    // Top-level navigation guard: prevent rogue scripts from navigating away while playing
    window.addEventListener('beforeunload', function (e) {
        if (isPlayerActive && !allowedInternalNavigation) {
            // Cancel redirect attempt
            e.preventDefault();
            e.returnValue = '';
            showBlockedToast('Redirect attempt blocked');
            return '';
        }
    });

    // Capture-phase link click interception
    document.addEventListener('click', function (e) {
        if (!isPlayerActive) return;

        // If an anchor was triggered programmatically while player is active
        const anchor = e.target.closest('a');
        if (anchor && anchor.href) {
            const href = anchor.href.toLowerCase();
            // Allow internal page jumps / hashes
            if (href.startsWith('#') || href.startsWith('javascript:')) return;

            // Block external link redirects while player is active unless explicitly trusted
            const isExternal = !anchor.href.startsWith(window.location.origin);
            if (isExternal || anchor.target === '_blank') {
                console.warn('[NetStream AdBlocker] Blocked rogue link redirect:', anchor.href);
                e.preventDefault();
                e.stopPropagation();
                showBlockedToast('Redirect prevented');
                pulseBadge();
            }
        }
    }, true);

    // Anti-Popunder Focus Lock: Ad networks open background tabs and blur the movie window
    window.addEventListener('blur', function () {
        if (isPlayerActive) {
            setTimeout(() => {
                // If focus was stolen by an ad popunder, immediately reclaim focus for NetStream
                if (isPlayerActive) {
                    window.focus();
                }
            }, 80);
        }
    });

    // Pulse animation for the shield badge in player modal
    function pulseBadge() {
        const badge = document.getElementById('adblockStatusPill');
        if (badge) {
            badge.classList.remove('pulse-shield');
            void badge.offsetWidth; // Trigger reflow
            badge.classList.add('pulse-shield');
            setTimeout(() => badge.classList.remove('pulse-shield'), 1200);
        }
    }

    // Show unobtrusive toast message confirming redirect was blocked
    function showBlockedToast(message = 'Pop-up redirect blocked') {
        let toast = document.getElementById('adblockToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adblockToast';
            toast.className = 'adblock-toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `
            <div class="adblock-toast-icon"><i class="fas fa-shield-halved"></i></div>
            <div class="adblock-toast-content">
                <strong>NetStream AdBlock</strong>
                <span>${message} — stream protected</span>
            </div>
        `;

        toast.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }

    // Allow genuine user navigation (e.g. clicking navbar or movies page)
    function permitNavigation() {
        allowedInternalNavigation = true;
    }

    window.NetStreamAdBlocker = {
        protectPlayerIframe,
        activate,
        deactivate,
        showBlockedToast,
        pulseBadge,
        permitNavigation,
        isActive: () => isPlayerActive
    };
})();


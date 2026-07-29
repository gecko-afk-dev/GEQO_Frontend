/**
 * ws.js — Shared WebSocket factory for dashboard KDS feeds.
 *
 * Auth strategy (mirrors the backend's priority in dashboard.py):
 *   1. httpOnly `access_token` cookie — sent automatically on same-origin or
 *      cross-site requests where SameSite=lax allows it (production default).
 *   2. Sec-WebSocket-Protocol: bearer.{token} — used as a fallback when the
 *      cookie is blocked (local cross-origin dev, different ports).
 *
 * Login.js stores a real JWT in localStorage.token when the backend returns
 * one, or the sentinel value 'cookie' when operating in cookie-only mode.
 * We only send the subprotocol when we have a real JWT.
 */

const _isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

/**
 * Open a dashboard WebSocket for a given restaurant.
 * Falls back to bearer subprotocol when a real JWT is available in localStorage.
 *
 * @param {number} restaurantId
 * @returns {WebSocket}
 */
export function createDashboardSocket(restaurantId) {
    const protocol = _isLocal ? 'ws:' : 'wss:';
    const host     = _isLocal ? 'localhost:8000' : 'api.mygeqo.com';
    const url      = `${protocol}//${host}/api/v1/dashboard/ws/${restaurantId}`;

    // Read token set by Login.js. The sentinel 'cookie' means the server is in
    // cookie-only mode — do NOT send 'bearer.cookie' as a subprotocol.
    const token = localStorage.getItem('token');
    const isRealToken = token && token !== 'cookie';

    // Pass subprotocol when we have a real JWT; rely on cookie auth otherwise.
    return isRealToken
        ? new WebSocket(url, [`bearer.${token}`])
        : new WebSocket(url);
}


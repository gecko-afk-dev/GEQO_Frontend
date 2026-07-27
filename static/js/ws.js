/**
 * ws.js — Shared WebSocket factory for dashboard KDS feeds.
 *
 * Production: the browser sends the httpOnly `access_token` cookie automatically
 * on the WS handshake (same-origin, or cross-site with SameSite=lax).
 * No token is read from JS memory.
 *
 * Local dev cross-origin: if the frontend runs on a different port to the API
 * the cookie is cross-site and may be blocked. In that case, serve both from
 * the same origin (FastAPI static mount or Caddy reverse proxy).
 */

const _isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

/**
 * Open a dashboard WebSocket for a given restaurant.
 * The access_token cookie is sent automatically — no JS token needed.
 *
 * @param {number} restaurantId
 * @returns {WebSocket}
 */
export function createDashboardSocket(restaurantId) {
    const protocol = _isLocal ? 'ws:' : 'wss:';
    const host     = _isLocal ? 'localhost:8000' : 'api.mygeqo.com';
    const url      = `${protocol}//${host}/api/v1/dashboard/ws/${restaurantId}`;

    // No subprotocol — rely on cookie auth. The backend accepts both.
    return new WebSocket(url);
}

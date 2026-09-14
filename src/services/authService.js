/**
 * authService.js
 *
 * Handles all authentication API calls for the admin dashboard.
 * Uses direct fetch calls and redirect-based Google OAuth.
 *
 * Supports two apps, each with its own backend base URL:
 *   - 'crik'        → https://test-stage.crik.ai
 *   - 'association' → https://stage-api.crik.ai
 */

const API_URLS = {
    crik:        'https://test-stage.crik.ai',
    association: 'https://stage-api.crik.ai',
};

function getBaseUrl(app = 'crik') {
    return API_URLS[app] ?? API_URLS.crik;
}

/**
 * Verify an existing session token or cookie session against the backend.
 * @param {string} token  The session token stored in localStorage.
 * @param {string} app    'crik' | 'association'
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function verifySession(token, app = 'crik') {
    const API_BASE_URL = getBaseUrl(app);
    try {
        const headers = { 'Content-Type': 'application/json' };

        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        const userData = Array.isArray(data) ? data[0] : data;

        return { success: true, user: userData };
    } catch (err) {
        console.error('[authService] verifySession error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Sign out the current user from the backend.
 * @param {string} token
 * @param {string} app  'crik' | 'association'
 */
export async function signOut(token, app = 'crik') {
    const API_BASE_URL = getBaseUrl(app);
    try {
        const headers = { 'Content-Type': 'application/json' };
        await fetch(`${API_BASE_URL}/api/auth/google/logout`, {
            method: 'POST',
            headers,
            credentials: 'include',
        });
    } catch (err) {
        console.warn('[authService] signOut error (ignored):', err);
    }
}

/**
 * Create a dashboard order to assign tokens to a user.
 * @param {string} token
 * @param {{ userId, amount, tokenCount }} payload
 * @param {string} app  'crik' | 'association'
 */
export const createDashboardOrder = async (token, { userId, amount, tokenCount }, app = 'crik') => {
    const API_BASE_URL = getBaseUrl(app);
    const response = await fetch(`${API_BASE_URL}/api/payments/dashboard-order`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ userId, amount, tokenCount }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
};

/**
 * Fetch all broadcasters from the backend.
 * @param {string} app  'crik' | 'association'
 */
export async function getBroadcasters(app = 'crik') {
    const API_BASE_URL = getBaseUrl(app);
    try {
        const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
        const response = await fetch(`${API_BASE_URL}/api/users/broadcasters`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });

        if (!response.ok) {
            console.warn('[authService] getBroadcasters failed:', response.status);
            return null;
        }

        return await response.json();
    } catch (err) {
        console.error('[authService] getBroadcasters error:', err);
        return null;
    }
}

/**
 * Initiates Google OAuth sign-in by opening a popup window.
 * Polls for popup closure and then checks if auth succeeded via cookies.
 *
 * @param {string} role  One of: 'BROADCASTER', 'GROUND', 'ASSOCIATIONS', 'ADMIN'
 * @param {string} app   'crik' | 'association'
 * @returns {Promise<{success: boolean, user?: object, sessionToken?: string, error?: string}>}
 */
export function googleSignIn(role, app = 'crik') {
    const API_BASE_URL = getBaseUrl(app);
    return new Promise((resolve) => {
        const authURL = `${API_BASE_URL}/api/auth/google?role=${encodeURIComponent(role)}&prompt=select_account`;
        console.log(`[authService] Opening Google OAuth popup: ${authURL}`);

        const popup = window.open(
            authURL,
            'google-auth',
            'width=600,height=700,left=200,top=100'
        );

        if (!popup) {
            resolve({ success: false, error: 'Popup blocked. Please allow popups for this site.' });
            return;
        }

        const backendOrigin = (() => {
            try {
                return new URL(API_BASE_URL).origin;
            } catch (e) {
                return null;
            }
        })();
        const allowedOrigins = [window.location.origin, 'http://localhost:5000', 'https://localhost:5000'];
        if (backendOrigin) {
            allowedOrigins.push(backendOrigin);
        }

        const handleMessage = async (event) => {
            if (!allowedOrigins.includes(event.origin)) return;

            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                cleanup();
                const token = event.data.sessionToken || event.data.token || 'cookie-session';
                const userResult = await fetchUserProfile(token, app);
                if (userResult) {
                    resolve({ success: true, sessionToken: token, user: userResult });
                } else {
                    resolve({ success: false, error: 'Failed to fetch user profile after auth' });
                }
            }

            if (event.data?.type === 'GOOGLE_AUTH_FAILURE') {
                cleanup();
                resolve({ success: false, error: event.data.error || 'Auth failed' });
            }
        };

        let popupClosedAt = null;
        const pollInterval = setInterval(async () => {
            try {
                // Try reading sessionToken from the popup's URL after redirect (if possible)
                try {
                    const popupUrl = popup.location.href; // This will throw if cross-origin
                    const urlParams = new URLSearchParams(popup.location.search);
                    const tokenFromUrl = urlParams.get('sessionToken') || urlParams.get('token');

                    if (tokenFromUrl) {
                        console.log('🔍 [authService] Token successfully extracted from popup URL:', tokenFromUrl.substring(0, 15) + '...');
                        cleanup();
                        if (!popup.closed) popup.close();
                        const userResult = await fetchUserProfile(tokenFromUrl, app);
                        resolve({ success: true, sessionToken: tokenFromUrl, user: userResult });
                        return;
                    } else if (popupUrl.includes('localhost')) {
                        console.log('🔍 [authService] Popup redirected to localhost, but no token found in URL:', popupUrl);
                    }
                } catch (err) {
                    // Cross-origin restriction — normal if popup is on Google or backend domain
                    if (!window.__loggedCrossOriginError) {
                        console.log('🔒 [authService] Cannot read popup URL directly due to cross-origin security (expected while on Google or backend domain).');
                        window.__loggedCrossOriginError = true;
                    }
                }

                // Poll the backend to see if the session cookie was set
                console.log('🔄 [authService] Polling /api/users/me using browser cookies to check if login succeeded...');
                const userResult = await fetchUserProfile('cookie-session', app);

                if (userResult) {
                    console.log('✅ [authService] Session established successfully via cookies! User:', userResult.email);
                    cleanup();
                    if (popup && !popup.closed) popup.close();
                    resolve({ success: true, sessionToken: 'cookie-session', user: userResult });
                    return;
                }

                if (popup && popup.closed) {
                    if (!popupClosedAt) {
                        popupClosedAt = Date.now();
                        console.log('⚠️ [authService] Popup closed; waiting a moment for cookie session to finalize...');
                    } else if (Date.now() - popupClosedAt > 30000) {
                        cleanup();
                        resolve({ success: false, error: 'Authentication window was closed before login completed' });
                        return;
                    }
                } else {
                    popupClosedAt = null;
                }

            } catch (e) {
                console.warn('⚠️ [authService] Poll loop error:', e);
            }
        }, 2000); // Poll every 2 seconds

        window.addEventListener('message', handleMessage);

        const cleanup = () => {
            clearInterval(pollInterval);
            window.removeEventListener('message', handleMessage);
        };

        setTimeout(() => {
            cleanup();
            if (!popup.closed) popup.close();
            resolve({ success: false, error: 'Authentication timed out' });
        }, 5 * 60 * 1000);
    });
}

/**
 * Fetch user profile from the backend.
 * @param {string} token
 * @param {string} app  'crik' | 'association'
 * @returns {Promise<object|null>}
 */
async function fetchUserProfile(token, app = 'crik') {
    const API_BASE_URL = getBaseUrl(app);
    try {
        const headers = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        };
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });

        if (!response.ok) return null;
        const data = await response.json();
        return Array.isArray(data) ? data[0] : data;
    } catch (err) {
        console.error('[authService] fetchUserProfile error:', err);
        return null;
    }
}
